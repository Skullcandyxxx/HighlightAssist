#!/usr/bin/env python3
"""
HighlightAssist Native Messaging Host

Receives commands from the browser extension and controls the local
bridge service/daemon so users can start/stop it without leaving Chrome.
"""
from __future__ import annotations

import json
import os
import socket
import struct
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional

HOST_NAME = "com.highlightassist.bridge"
CONTROL_PORT = 5054
BRIDGE_PORT = 5055
DEFAULT_SHELL = os.name == "nt"
CONNECT_TIMEOUT_SECONDS = 5
SERVICE_BOOT_RETRIES = 10
SERVICE_BOOT_SLEEP = 0.5

BASE_DIR = Path(__file__).resolve().parent.parent
SERVICE_MANAGER = BASE_DIR / "service-manager.py"
STARTER_SCRIPT = BASE_DIR / "start-service.bat"
LOG_DIR = Path(os.environ.get("LOCALAPPDATA", BASE_DIR / "logs")) / "HighlightAssist" / "logs"
LOG_FILE = LOG_DIR / "native-host.log"
WORKSPACES_FILE = BASE_DIR / 'native_host_workspaces.json'
PROJECTS_FILE = BASE_DIR / 'native_host_projects.json'

# Windows-specific creation flags (ignored on other platforms)
CREATE_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)
DETACHED_PROCESS = getattr(subprocess, "DETACHED_PROCESS", 0)


def log(message: str, data: Optional[Dict[str, Any]] = None) -> None:
    """Simple file logger to help debug host issues."""
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        with LOG_FILE.open("a", encoding="utf-8") as handle:
            payload = {
                "message": message,
                "data": data or {},
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
            }
            handle.write(json.dumps(payload) + os.linesep)
    except Exception:
        # Never let logging failures crash the host
        pass


def read_message() -> Optional[Dict[str, Any]]:
    """Read a single message from stdin (native messaging framing)."""
    raw_length = sys.stdin.buffer.read(4)
    if len(raw_length) == 0:
        return None

    message_length = struct.unpack("<I", raw_length)[0]
    message = sys.stdin.buffer.read(message_length).decode("utf-8", errors="ignore")
    if not message:
        return None
    try:
        return json.loads(message)
    except json.JSONDecodeError as exc:
        log("Failed to decode incoming message", {"error": str(exc), "payload": message})
        return None


def send_message(message: Dict[str, Any]) -> None:
    """Send JSON message to stdout with native messaging framing."""
    encoded = json.dumps(message).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()


def is_port_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex(("127.0.0.1", port)) == 0


def send_manager_command(command: str) -> Dict[str, Any]:
    """Send JSON command to the service manager over TCP."""
    payload = json.dumps({"action": command}).encode("utf-8")
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(CONNECT_TIMEOUT_SECONDS)
        sock.connect(("127.0.0.1", CONTROL_PORT))
        sock.sendall(payload)
        response = sock.recv(4096).decode("utf-8") or "{}"
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        return {"status": "error", "error": "invalid_manager_response"}


def _launcher_candidates() -> list[list[str]]:
    launchers: list[list[str]] = []
    if os.name == "nt":
        launchers.extend(
            [
                ["pythonw", str(SERVICE_MANAGER)],
                ["python", str(SERVICE_MANAGER)],
                ["pyw", str(SERVICE_MANAGER)],
                ["py", str(SERVICE_MANAGER)],
            ]
        )
        if STARTER_SCRIPT.exists():
            launchers.append(["cmd.exe", "/c", "start", '""', "/min", str(STARTER_SCRIPT)])
    else:
        launchers.extend(
            [
                ["python3", str(SERVICE_MANAGER)],
                ["python", str(SERVICE_MANAGER)],
            ]
        )
    return launchers


def start_service_manager() -> bool:
    """Attempt to start the service manager process."""
    creationflags = CREATE_NO_WINDOW | DETACHED_PROCESS
    for command in _launcher_candidates():
        try:
            subprocess.Popen(
                command,
                cwd=str(BASE_DIR),
                creationflags=creationflags,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            log("Service manager launch attempt", {"command": command})
            return True
        except FileNotFoundError:
            continue
        except Exception as exc:
            log("Service manager launch failed", {"command": command, "error": str(exc)})
    return False


def ensure_service_manager() -> bool:
    """Ensure the control socket is available, starting the manager if required."""
    if is_port_open(CONTROL_PORT):
        return True

    start_service_manager()
    for _ in range(SERVICE_BOOT_RETRIES):
        if is_port_open(CONTROL_PORT):
            return True
        time.sleep(SERVICE_BOOT_SLEEP)
    return False


def run_workspace_command(payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not payload:
        return {"status": "error", "error": "missing_payload"}

    cwd = payload.get("cwd")
    command = payload.get("command")
    if not cwd or not command:
        return {"status": "error", "error": "missing_cwd_or_command"}

    workdir = Path(cwd).expanduser()
    if not workdir.exists():
        return {"status": "error", "error": "cwd_not_found"}

    shell = payload.get("shell", DEFAULT_SHELL)
    creationflags = CREATE_NO_WINDOW | DETACHED_PROCESS
    try:
        process = subprocess.Popen(
            command,
            cwd=str(workdir),
            shell=shell,
            creationflags=creationflags,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        # Record in workspace registry
        try:
            workspaces = _load_workspaces()
        except Exception:
            workspaces = []

        wid = payload.get('id') or _generate_id()
        entry = {
            'id': wid,
            'pid': process.pid,
            'cwd': str(workdir),
            'command': command,
            'started': time.strftime('%Y-%m-%dT%H:%M:%S'),
            'shell': bool(shell),
        }
        workspaces.append(entry)
        _save_workspaces(workspaces)

        log(
            "Workspace command launched",
            {"cwd": str(workdir), "command": command, "pid": process.pid, 'id': wid},
        )
        return {
            "status": "started",
            "id": wid,
            "pid": process.pid,
            "cwd": str(workdir),
            "command": command,
        }
    except FileNotFoundError:
        return {"status": "error", "error": "command_not_found"}
    except Exception as exc:
        log("Workspace command failed", {"error": str(exc), "cwd": str(workdir)})
        return {"status": "error", "error": str(exc)}


def _generate_id() -> str:
    return "w_" + str(int(time.time() * 1000)) + '_' + str(os.getpid())[-4:]


def _load_workspaces() -> list:
    try:
        if WORKSPACES_FILE.exists():
            with WORKSPACES_FILE.open('r', encoding='utf-8') as f:
                return json.load(f)
    except Exception:
        pass
    return []


def _save_workspaces(listing: list) -> None:
    try:
        with WORKSPACES_FILE.open('w', encoding='utf-8') as f:
            json.dump(listing, f, indent=2)
    except Exception:
        pass


def _is_running(pid: int) -> bool:
    try:
        if os.name == 'nt':
            # Use tasklist to check for PID
            res = subprocess.run(['tasklist', '/FI', f'PID eq {pid}'], capture_output=True, text=True)
            return str(pid) in res.stdout
        else:
            os.kill(pid, 0)
            return True
    except Exception:
        return False


def kill_workspace(payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not payload:
        return {"status": "error", "error": "missing_payload"}
    wid = payload.get('id')
    pid = payload.get('pid')
    workspaces = _load_workspaces()
    target = None
    if wid:
        for e in workspaces:
            if e.get('id') == wid:
                target = e
                break
    elif pid:
        for e in workspaces:
            if int(e.get('pid', -1)) == int(pid):
                target = e
                break

    if not target:
        return {"status": "error", "error": "not_found"}

    try:
        tpid = int(target.get('pid'))
        if os.name == 'nt':
            subprocess.run(['taskkill', '/F', '/PID', str(tpid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            os.kill(tpid, 15)
        # remove entry
        workspaces = [e for e in workspaces if e.get('id') != target.get('id')]
        _save_workspaces(workspaces)
        log('Workspace killed', {'id': target.get('id'), 'pid': tpid})
        return {"status": "stopped", "id": target.get('id'), "pid": tpid}
    except Exception as exc:
        log('Failed to kill workspace', {'error': str(exc), 'target': target})
        return {"status": "error", "error": str(exc)}


def list_workspaces(payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    workspaces = _load_workspaces()
    for e in workspaces:
        try:
            e['running'] = _is_running(int(e.get('pid', -1)))
        except Exception:
            e['running'] = False
    return {"status": "ok", "workspaces": workspaces}


def save_project(payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not payload:
        return {"status": "error", "error": "missing_payload"}
    projects = []
    try:
        if PROJECTS_FILE.exists():
            with PROJECTS_FILE.open('r', encoding='utf-8') as f:
                projects = json.load(f)
    except Exception:
        projects = []
    projects.append(payload)
    try:
        with PROJECTS_FILE.open('w', encoding='utf-8') as f:
            json.dump(projects, f, indent=2)
    except Exception as exc:
        return {"status": "error", "error": str(exc)}
    return {"status": "ok", "project": payload}


def get_projects(payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    try:
        if PROJECTS_FILE.exists():
            with PROJECTS_FILE.open('r', encoding='utf-8') as f:
                projects = json.load(f)
                return {"status": "ok", "projects": projects}
    except Exception:
        pass
    return {"status": "ok", "projects": []}


def handle_command(command: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Handle extension command and return response payload."""
    if command in ("ping", "status"):
        return {"status": "ok", "bridgeRunning": is_port_open(BRIDGE_PORT)}

    if command == "run_workspace_command":
        return run_workspace_command(payload)

    if command == 'list_workspaces':
        return list_workspaces(payload)

    if command == 'kill_workspace':
        return kill_workspace(payload)

    if command == 'save_project':
        return save_project(payload)

    if command == 'get_projects':
        return get_projects(payload)

    if command not in {"start_bridge", "stop_bridge", "bridge_status"}:
        return {"status": "error", "error": "unknown_command"}

    if not ensure_service_manager():
        return {"status": "error", "error": "service_manager_unavailable"}

    manager_command = {
        "start_bridge": "start",
        "stop_bridge": "stop",
        "bridge_status": "status",
    }[command]

    try:
        response = send_manager_command(manager_command)
        # Normalize shape
        return {
            "status": "ok",
            "managerResponse": response,
            "bridgeRunning": response.get("running")
            if manager_command == "status"
            else response.get("status") in {"already_running", "started"},
        }
    except (OSError, socket.error) as exc:
        log("Failed sending manager command", {"error": str(exc), "command": manager_command})
        return {"status": "error", "error": "control_socket_unreachable"}


def main() -> None:
    log("Native messaging host started", {"path": str(BASE_DIR)})
    while True:
        message = read_message()
        if message is None:
            break

        # Support both 'command' and legacy 'action' keys
        command = message.get("command") or message.get('action')
        response = handle_command(command, message.get("payload")) if command else {"status": "error", "error": "missing_command"}
        send_message(response)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("Native host interrupted by user")
    except Exception as exc:  # pragma: no cover - safety net
        log("Native host crashed", {"error": str(exc)})
