"""Service manager (clean copy) for local testing.

This is a single-file, cleaned implementation. Use this for running locally while the original
`service-manager.py` is repaired.
"""

from __future__ import annotations

import json
import logging
import os
import signal
import socket
import subprocess
import sys
import threading
import time
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Optional, Tuple

SERVICE_PORT = 5054
BRIDGE_PORT = 5055

# Optional imports
try:
    import pystray
    from PIL import Image, ImageDraw
    HAS_TRAY = True
except Exception:
    HAS_TRAY = False

logger = logging.getLogger('highlightassist.service')
LOG_DIR = Path(os.environ.get('LOCALAPPDATA', '.')) / 'HighlightAssist' / 'logs'
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / 'service-manager-clean.log'
if not logger.handlers:
    h = RotatingFileHandler(str(LOG_FILE), maxBytes=1024 * 1024, backupCount=3, encoding='utf-8')
    h.setFormatter(logging.Formatter('%(asctime)s %(levelname)s %(name)s: %(message)s'))
    logger.addHandler(h)
    logger.setLevel(logging.INFO)


class ServiceManager:
    def __init__(self, control_port: int = SERVICE_PORT, bridge_port: int = BRIDGE_PORT) -> None:
        self.control_port = control_port
        self.bridge_port = bridge_port
        self.running = True
        self._server: Optional[socket.socket] = None
        self._threads: list[threading.Thread] = []
        self._bridge_proc: Optional[subprocess.Popen] = None

    def _is_bridge_alive(self) -> bool:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.1)
                return s.connect_ex(('127.0.0.1', self.bridge_port)) == 0
        except Exception:
            return False

    def start_bridge(self) -> dict:
        if self._is_bridge_alive():
            return {'status': 'already_running'}
        try:
            popen_kwargs = dict(cwd=Path(__file__).parent)
            self._bridge_proc = subprocess.Popen([
                sys.executable, '-m', 'uvicorn', 'bridge:app', '--host', '127.0.0.1', '--port', str(self.bridge_port)
            ], **popen_kwargs)
            for _ in range(12):
                if self._is_bridge_alive():
                    logger.info('Bridge started')
                    return {'status': 'started', 'pid': getattr(self._bridge_proc, 'pid', None)}
                time.sleep(0.25)
            return {'status': 'timeout'}
        except Exception as e:
            logger.exception('Failed starting bridge')
            return {'status': 'error', 'error': str(e)}

    def stop_bridge(self) -> dict:
        if self._bridge_proc:
            try:
                self._bridge_proc.terminate()
                self._bridge_proc.wait(timeout=5)
            except Exception:
                try:
                    self._bridge_proc.kill()
                except Exception:
                    logger.exception('Failed killing bridge')
            finally:
                self._bridge_proc = None
            return {'status': 'stopped'}
        if not self._is_bridge_alive():
            return {'status': 'not_running'}
        return {'status': 'stopped'}

    def _handle_client(self, client: socket.socket, addr: Tuple[str, int]) -> None:
        try:
            data = client.recv(8192)
            if not data:
                client.close()
                return
            try:
                msg = json.loads(data.decode('utf-8', errors='ignore'))
            except json.JSONDecodeError:
                client.send(json.dumps({'error': 'invalid_json'}).encode('utf-8'))
                client.close()
                return
            action = msg.get('action')
            if action == 'start':
                resp = self.start_bridge()
            elif action == 'stop':
                resp = self.stop_bridge()
            elif action == 'status':
                resp = {'running': self._is_bridge_alive(), 'port': self.bridge_port}
            else:
                resp = {'error': 'unknown_action'}
            client.send(json.dumps(resp).encode('utf-8'))
        except Exception:
            logger.exception('Client handler error')
        finally:
            try:
                client.close()
            except Exception:
                pass

    def run(self) -> None:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(('127.0.0.1', self.control_port))
        s.listen(5)
        s.settimeout(1.0)
        self._server = s
        logger.info('Service manager listening on %s', self.control_port)
        try:
            while self.running:
                try:
                    client, addr = s.accept()
                except socket.timeout:
                    continue
                t = threading.Thread(target=self._handle_client, args=(client, addr), daemon=True)
                t.start()
                self._threads.append(t)
        finally:
            try:
                s.close()
            except Exception:
                pass


if __name__ == '__main__':
    mgr = ServiceManager()
    mgr.run()
