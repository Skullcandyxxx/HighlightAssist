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
CONNECT_TIMEOUT_SECONDS = 5
SERVICE_BOOT_RETRIES = 10
SERVICE_BOOT_SLEEP = 0.5

BASE_DIR = Path(__file__).resolve().parent.parent
SERVICE_MANAGER = BASE_DIR / "service-manager.py"
STARTER_SCRIPT = BASE_DIR / "start-service.bat"
LOG_DIR = Path(os.environ.get("LOCALAPPDATA", BASE_DIR / "logs")) / "HighlightAssist" / "logs"
LOG_FILE = LOG_DIR / "native-host.log"

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


def handle_command(command: str) -> Dict[str, Any]:
    """Handle extension command and return response payload."""
    if command == "ping":
        return {"status": "ok", "bridgeRunning": is_port_open(BRIDGE_PORT)}

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

        command = message.get("command")
        response = handle_command(command) if command else {"status": "error", "error": "missing_command"}
        send_message(response)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("Native host interrupted by user")
    except Exception as exc:  # pragma: no cover - safety net
        log("Native host crashed", {"error": str(exc)})
