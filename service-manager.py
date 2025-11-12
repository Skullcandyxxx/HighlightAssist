"""HighlightAssist service-manager

Lightweight, defensive service manager that listens on a local TCP control
port (default 5054) for JSON commands from the browser extension and starts
or stops the bridge (uvicorn serving `bridge:app` on port 5055).


This single-file implementation is written to be easy to bundle with
PyInstaller and robust in the face of missing optional dependencies.
"""

import sys
import os
import subprocess
import json
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
import socket
import threading
import time
import signal
from typing import Optional

# Optional GUI / notification libs
try:
    import pystray
    from PIL import Image, ImageDraw
    HAS_TRAY = True
except Exception:
    HAS_TRAY = False

# Notification backends (platform-dependent)
HAS_PLYER = False
HAS_WIN10TOAST = False
HAS_NOTIFY2 = False
HAS_PYNC = False
try:
    from plyer import notification as plyer_notification
    HAS_PLYER = True
except Exception:
    HAS_PLYER = False

if sys.platform.startswith('win'):
    try:
        from win10toast import ToastNotifier
        HAS_WIN10TOAST = True
    except Exception:
        HAS_WIN10TOAST = False
elif sys.platform.startswith('linux'):
    try:
        import notify2
        HAS_NOTIFY2 = True
    except Exception:
        HAS_NOTIFY2 = False
elif sys.platform.startswith('darwin'):
    try:
        import pync
        HAS_PYNC = True
    except Exception:
        HAS_PYNC = False

SERVICE_PORT = 5054  # Control port (bridge runs on 5055)
BRIDGE_SCRIPT = Path(__file__).parent / "bridge.py"

# Logging setup
LOG_DIR = Path(os.environ.get('LOCALAPPDATA', '.')) / 'HighlightAssist' / 'logs'
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / 'service-manager.log'

logger = logging.getLogger('highlightassist.service')
if not logger.handlers:
    handler = RotatingFileHandler(str(LOG_FILE), maxBytes=1024 * 1024, backupCount=3, encoding='utf-8')
    formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s: %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)




# --- SINGLE, RELIABLE SERVICEMANAGER CLASS ---
class ServiceManager:
    def __init__(self):
        self.bridge_process = None
        self.running = True
        self._tray_icon = None
        self.connected_clients = set()
        self._server_socket: Optional[socket.socket] = None
        self._threads: list[threading.Thread] = []

    def is_bridge_running(self) -> bool:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                return sock.connect_ex(('127.0.0.1', 5055)) == 0
        except Exception as e:
            logger.exception('Error checking bridge port: %s', e)
            return False

    def start_bridge(self):
        if self.is_bridge_running():
            return {"status": "already_running", "port": 5055}
        try:
            logger.info('Starting bridge with Python: %s', sys.executable)
            self.bridge_process = subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "bridge:app", "--host=127.0.0.1", "--port=5055"],
                cwd=Path(__file__).parent,
                creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform.startswith('win') else 0
            )
            for _ in range(10):
                if self.is_bridge_running():
                    self._notify('HighlightAssist', 'Bridge started and listening on port 5055')
                    return {"status": "started", "port": 5055, "pid": self.bridge_process.pid}
                time.sleep(0.5)
            logger.warning('Bridge start timed out')
            return {"status": "failed", "error": "timeout"}
        except Exception as e:
            logger.exception('Failed to start bridge: %s', e)
            return {"status": "error", "error": str(e)}

    def stop_bridge(self):
        if self.bridge_process:
            try:
                self.bridge_process.terminate()
                self.bridge_process.wait(timeout=5)
            except Exception as e:
                logger.exception('Failed to terminate bridge process: %s', e)
            finally:
                self.bridge_process = None
            self._notify('HighlightAssist', 'Bridge stopped')
            logger.info('Bridge stopped')
            return {"status": "stopped"}
        return {"status": "not_running"}

    def _notify(self, title: str, message: str) -> None:
        try:
            if sys.platform.startswith('win'):
                if HAS_WIN10TOAST:
                    try:
                        toaster = ToastNotifier()
                        toaster.show_toast(title, message, threaded=True, icon_path=None, duration=4)
                        return
                    except Exception:
                        pass
                if HAS_PLYER:
                    try:
                        plyer_notification.notify(title=title, message=message, app_name='HighlightAssist')
                        return
                    except Exception:
                        pass
            elif sys.platform.startswith('darwin'):
                if HAS_PYNC:
                    try:
                        pync.notify(message, title=title)
                        return
                    except Exception:
                        pass
                if HAS_PLYER:
                    try:
                        plyer_notification.notify(title=title, message=message, app_name='HighlightAssist')
                        return
                    except Exception:
                        pass
            else:
                if HAS_NOTIFY2:
                    try:
                        notify2.init('HighlightAssist')
                        n = notify2.Notification(title, message)
                        n.show()
                        return
                    except Exception:
                        pass
                if HAS_PLYER:
                    try:
                        plyer_notification.notify(title=title, message=message, app_name='HighlightAssist')
                        return
                    except Exception:
                        pass
                try:
                    subprocess.Popen(['notify-send', title, message])
                    return
                except Exception:
                    pass
            logger.info('[NOTIFY] %s: %s', title, message)
        except Exception:
            logger.exception('Notification error')

    def _generate_icon(self, size=(64, 64)) -> Optional[Image.Image]:
        if not HAS_TRAY:
            return None
        try:
            try:
                assets_dir = Path(__file__).resolve().parent.parent / 'assets'
                icon_path = assets_dir / 'icon-128.png'
                if icon_path.exists():
                    img = Image.open(str(icon_path)).convert('RGBA')
                    img = img.resize(size)
                    return img
            except Exception:
                pass
            img = Image.new('RGBA', size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)
            w, h = size
            draw.ellipse((4, 4, w-4, h-4), fill=(59,130,246, 230))
            draw.text((w//3, h//3), 'HA', fill='white')
            return img
        except Exception:
            return None

    def _open_logs(self):
        try:
            log_path = Path(os.environ.get('LOCALAPPDATA', '.')) / 'HighlightAssist' / 'logs' / 'native-host.log'
            if log_path.exists():
                if sys.platform.startswith('win'):
                    os.startfile(str(log_path))
                elif sys.platform.startswith('darwin'):
                    subprocess.Popen(['open', str(log_path)])
                else:
                    subprocess.Popen(['xdg-open', str(log_path)])
            else:
                self._notify('HighlightAssist', f'Log file not found: {log_path}')
        except Exception as e:
            logger.exception('Failed opening logs: %s', e)

    def handle_client(self, client_socket, addr=None):
        try:
            try:
                if addr:
                    self.connected_clients.add((addr[0], addr[1]))
                else:
                    try:
                        peer = client_socket.getpeername()
                        self.connected_clients.add((peer[0], peer[1]))
                    except OSError:
                        pass
            except Exception:
                logger.exception('Error registering client')
            data = b''
            try:
                data = client_socket.recv(8192)
            except Exception:
                logger.exception('Error reading from client socket')
            if not data:
                logger.debug('No data received from client')
                client_socket.close()
                return
            try:
                command = json.loads(data.decode('utf-8', errors='ignore'))
            except json.JSONDecodeError:
                logger.warning('Invalid JSON from client: %s', data[:200])
                try:
                    client_socket.send(json.dumps({'error': 'invalid_json'}).encode('utf-8'))
                except Exception:
                    logger.exception('Failed to send invalid_json response')
                client_socket.close()
                return
            action = command.get('action')
            if action == 'start':
                response = self.start_bridge()
            elif action == 'stop':
                response = self.stop_bridge()
            elif action == 'status':
                response = {
                    'running': self.is_bridge_running(),
                    'port': 5055
                }
            else:
                response = {'error': 'unknown_command'}
            try:
                client_socket.send(json.dumps(response).encode('utf-8'))
            except Exception:
                logger.exception('Failed to send response to client')
        except Exception as e:
            logger.exception('Unhandled error in handle_client')
            try:
                error_response = {'error': str(e)}
                client_socket.send(json.dumps(error_response).encode('utf-8'))
            except Exception:
                logger.exception('Failed sending error response')
        finally:
            try:
                client_socket.close()
            except Exception:
                logger.exception('Error closing client socket')
            try:
                if addr:
                    self.connected_clients.discard((addr[0], addr[1]))
                else:
                    try:
                        peer = client_socket.getpeername()
                        self.connected_clients.discard((peer[0], peer[1]))
                    except OSError:
                        pass
            except Exception:
                logger.exception('Error cleaning up client')

    def _server_thread(self):
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(('127.0.0.1', SERVICE_PORT))
        server.listen(5)
        server.settimeout(1.0)
        self._server_socket = server
        logger.info('HighlightAssist Service Manager v1.0 starting')
        logger.info('Control Port: %s, Bridge Port: 5055 - listening for commands', SERVICE_PORT)
        try:
            while self.running:
                try:
                    client, addr = server.accept()
                except socket.timeout:
                    continue
                except OSError:
                    break
                client_thread = threading.Thread(target=self.handle_client, args=(client, addr), daemon=True)
                client_thread.start()
                self._threads.append(client_thread)
        except Exception:
            logger.exception('Error in service run loop')
        finally:
            logger.info('Service manager shutting down...')
            try:
                if self._server_socket:
                    try:
                        self._server_socket.close()
                    except Exception:
                        pass
            except Exception:
                logger.exception('Error closing server socket')
            if self.bridge_process:
                try:
                    self.bridge_process.terminate()
                except Exception:
                    logger.exception('Error terminating bridge during shutdown')
            for t in self._threads:
                try:
                    if t.is_alive():
                        t.join(timeout=1.0)
                except Exception:
                    pass

    def run_with_tray(self):
        # Start the TCP server in a background thread
        server_thread = threading.Thread(target=self._server_thread, daemon=True)
        server_thread.start()
        self._threads.append(server_thread)

        # Build tray icon and menu
        if not HAS_TRAY:
            logger.error('pystray not available; cannot create tray icon')
            print('pystray not available; cannot create tray icon')
            # Block main thread until server thread exits
            server_thread.join()
            return

        def on_stop(icon, item):
            self.stop_bridge()

        def on_status(icon, item):
            running = self.is_bridge_running()
            self._notify('HighlightAssist', f'Bridge running: {running}')

        def on_quit(icon, item):
            logger.info('Tray requested quit')
            self.running = False
            try:
                if self.bridge_process:
                    self.bridge_process.terminate()
            except Exception:
                logger.exception('Error terminating bridge during quit')
            try:
                icon.stop()
            except Exception:
                logger.exception('Error stopping tray icon')

        icon_image = self._generate_icon((64, 64)) or Image.new('RGBA', (64, 64), (59,130,246,255))
        menu = pystray.Menu(
            pystray.MenuItem('Stop Server', on_stop),
            pystray.MenuItem('Status', on_status),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem('Exit', on_quit)
        )
        self._tray_icon = pystray.Icon('highlightassist', icon_image, 'HighlightAssist', menu)
        # This call blocks and runs the tray icon in the main thread
        self._tray_icon.run()


if __name__ == "__main__":
    manager = ServiceManager()
    manager.run_with_tray()

"""
HighlightAssist Service Manager - resilient, logged, and cross-platform
This manager listens on a local control TCP port to accept simple JSON
commands from the browser extension (start/stop/status) and provides an
optional system tray and desktop notifications. The implementation is
defensive so it can be bundled with PyInstaller into a single-file exe.
"""


import sys
import os
import subprocess
import json
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
import socket
import threading
import time
import signal
from typing import Optional

# Optional GUI / notification libs
try:
    import pystray
    from PIL import Image, ImageDraw
    HAS_TRAY = True
except Exception:
    HAS_TRAY = False

# Notification backends (platform-dependent)
HAS_PLYER = False
HAS_WIN10TOAST = False
HAS_NOTIFY2 = False
HAS_PYNC = False
try:
    from plyer import notification as plyer_notification
    HAS_PLYER = True
except Exception:
    HAS_PLYER = False

if sys.platform.startswith('win'):
    try:
        from win10toast import ToastNotifier
        HAS_WIN10TOAST = True
    except Exception:
        HAS_WIN10TOAST = False
elif sys.platform.startswith('linux'):
    try:
        import notify2
        HAS_NOTIFY2 = True
    except Exception:
        HAS_NOTIFY2 = False
elif sys.platform.startswith('darwin'):
    try:
        import pync
        HAS_PYNC = True
    except Exception:
        HAS_PYNC = False

SERVICE_PORT = 5054  # Control port (bridge runs on 5055)
BRIDGE_SCRIPT = Path(__file__).parent / "bridge.py"

# Logging setup
LOG_DIR = Path(os.environ.get('LOCALAPPDATA', '.')) / 'HighlightAssist' / 'logs'
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / 'service-manager.log'

logger = logging.getLogger('highlightassist.service')
if not logger.handlers:
    handler = RotatingFileHandler(str(LOG_FILE), maxBytes=1024 * 1024, backupCount=3, encoding='utf-8')
    formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s: %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


class ServiceManager:
    def __init__(self):
        self.bridge_process = None
        self.running = True
        self._tray_icon = None
        self.connected_clients = set()
        self._server_socket: Optional[socket.socket] = None
        self._threads: list[threading.Thread] = []

    def is_bridge_running(self) -> bool:
        """Check if bridge is already running on port 5055"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                return sock.connect_ex(('127.0.0.1', 5055)) == 0
        except Exception as e:
            logger.exception('Error checking bridge port: %s', e)
            return False

    def start_bridge(self):
        """Start the bridge server (uvicorn bridge:app)."""
        if self.is_bridge_running():
            return {"status": "already_running", "port": 5055}

        try:
            logger.info('Starting bridge with Python: %s', sys.executable)
            self.bridge_process = subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "bridge:app", "--host=127.0.0.1", "--port=5055"],
                cwd=Path(__file__).parent,
                creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform.startswith('win') else 0
            )

            for _ in range(10):
                if self.is_bridge_running():
                    self._notify('HighlightAssist', 'Bridge started and listening on port 5055')
                    return {"status": "started", "port": 5055, "pid": self.bridge_process.pid}
                time.sleep(0.5)

            logger.warning('Bridge start timed out')
            return {"status": "failed", "error": "timeout"}
        except Exception as e:
            logger.exception('Failed to start bridge: %s', e)
            return {"status": "error", "error": str(e)}

    def stop_bridge(self):
        """Stop the bridge server"""
        if self.bridge_process:
            try:
                self.bridge_process.terminate()
                self.bridge_process.wait(timeout=5)
            except Exception as e:
                logger.exception('Failed to terminate bridge process: %s', e)
            finally:
                self.bridge_process = None
            self._notify('HighlightAssist', 'Bridge stopped')
            logger.info('Bridge stopped')
            return {"status": "stopped"}
        return {"status": "not_running"}

    def _notify(self, title: str, message: str) -> None:
        """Show a desktop notification using the best-available backend for the platform.

        Fallback order (best-effort): win10toast/pync/notify2 -> plyer -> system command -> logger
        """
        try:
            if sys.platform.startswith('win'):
                if HAS_WIN10TOAST:
                    try:
                        toaster = ToastNotifier()
                        toaster.show_toast(title, message, threaded=True, icon_path=None, duration=4)
                        return
                    except Exception:
                        pass
                if HAS_PLYER:
                    try:
                        plyer_notification.notify(title=title, message=message, app_name='HighlightAssist')
                        return
                    except Exception:
                        pass

            elif sys.platform.startswith('darwin'):
                if HAS_PYNC:
                    try:
                        pync.notify(message, title=title)
                        return
                    except Exception:
                        pass
                if HAS_PLYER:
                    try:
                        plyer_notification.notify(title=title, message=message, app_name='HighlightAssist')
                        return
                    except Exception:
                        pass

            else:  # linux & others
                if HAS_NOTIFY2:
                    try:
                        notify2.init('HighlightAssist')
                        n = notify2.Notification(title, message)
                        n.show()
                        return
                    except Exception:
                        pass
                if HAS_PLYER:
                    try:
                        plyer_notification.notify(title=title, message=message, app_name='HighlightAssist')
                        return
                    except Exception:
                        pass
                try:
                    subprocess.Popen(['notify-send', title, message])
                    return
                except Exception:
                    pass

            logger.info('[NOTIFY] %s: %s', title, message)
        except Exception:
            logger.exception('Notification error')

    # ---------- Tray (optional) ----------
    def _generate_icon(self, size=(64, 64)) -> Optional[Image.Image]:
        """Generate a simple tray icon using PIL (if available)."""
        if not HAS_TRAY:
            return None
        try:
            try:
                assets_dir = Path(__file__).resolve().parent.parent / 'assets'
                icon_path = assets_dir / 'icon-128.png'
                if icon_path.exists():
                    img = Image.open(str(icon_path)).convert('RGBA')
                    img = img.resize(size)
                    return img
            except Exception:
                pass

            img = Image.new('RGBA', size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)
            w, h = size
            draw.ellipse((4, 4, w-4, h-4), fill=(59,130,246, 230))
            draw.text((w//3, h//3), 'HA', fill='white')
            return img
        except Exception:
            return None

    def _create_tray(self):
        """Create and run a system tray icon with a minimal menu if pystray is available."""
        if not HAS_TRAY:
            return

        def on_stop(icon, item):
            self.stop_bridge()

        def on_manager(icon, item):
            running = self.is_bridge_running()
            self._notify('HighlightAssist', f'Bridge running: {running}')
            self._open_logs()

        def on_clients(icon, item):
            if not self.connected_clients:
                self._notify('HighlightAssist', 'No active clients')
                return
            clients = '\n'.join([f'{c[0]}:{c[1]}' for c in self.connected_clients])
            if len(clients) > 400:
                clients = clients[:400] + '\n…'
            self._notify('HighlightAssist', f'Clients:\n{clients}')

        def on_logs(icon, item):
            self._open_logs()

        def on_quit(icon, item):
            logger.info('Tray requested quit')
            self.running = False
            try:
                if self.bridge_process:
                    self.bridge_process.terminate()
            except Exception:
                logger.exception('Error terminating bridge during quit')
            try:
                icon.stop()
            except Exception:
                logger.exception('Error stopping tray icon')

        icon_image = self._generate_icon((64, 64)) or Image.new('RGBA', (64, 64), (59,130,246,255))

        def connections_label():
            if not self.connected_clients:
                return 'No connections'
            return f'{len(self.connected_clients)} connection(s)'

        def build_menu():
            return pystray.Menu(
                pystray.MenuItem(lambda: connections_label(), None, enabled=False),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem('Stop Server', on_stop),
                pystray.MenuItem('Manager...', on_manager),
                pystray.MenuItem('Client...', on_clients),
                pystray.MenuItem('Logs...', on_logs),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem('Exit', on_quit)
            )

        menu = build_menu()
        self._tray_icon = pystray.Icon('highlightassist', icon_image, 'HighlightAssist', menu)
        t = threading.Thread(target=self._tray_icon.run, daemon=True)
        t.start()
        self._threads.append(t)
        self._tray_menu_builder = build_menu

    def _update_tray_menu(self) -> None:
        """Rebuild tray menu to reflect updated connection count."""
        if not HAS_TRAY or not self._tray_icon:
            return
        try:
            new_menu = self._tray_menu_builder()
            self._tray_icon.menu = new_menu
            if hasattr(self._tray_icon, 'update_menu'):
                try:
                    self._tray_icon.update_menu()
                except Exception:
                    pass
        except Exception:
            logger.exception('Failed updating tray menu')

    def handle_client(self, client_socket, addr=None):
        """Handle commands from extension"""
        try:
            try:
                if addr:
                    self.connected_clients.add((addr[0], addr[1]))
                else:
                    try:
                        peer = client_socket.getpeername()
                        self.connected_clients.add((peer[0], peer[1]))
                    except OSError:
                        pass
                self._update_tray_menu()
            except Exception:
                logger.exception('Error registering client')

            data = b''
            try:
                data = client_socket.recv(8192)
            except Exception:
                logger.exception('Error reading from client socket')
            if not data:
                logger.debug('No data received from client')
                client_socket.close()
                return

            try:
                command = json.loads(data.decode('utf-8', errors='ignore'))
            except json.JSONDecodeError:
                logger.warning('Invalid JSON from client: %s', data[:200])
                try:
                    client_socket.send(json.dumps({'error': 'invalid_json'}).encode('utf-8'))
                except Exception:
                    logger.exception('Failed to send invalid_json response')
                client_socket.close()
                return

            action = command.get('action')
            if action == 'start':
                response = self.start_bridge()
            elif action == 'stop':
                response = self.stop_bridge()
            elif action == 'status':
                response = {
                    'running': self.is_bridge_running(),
                    'port': 5055
                }
            else:
                response = {'error': 'unknown_command'}

            try:
                client_socket.send(json.dumps(response).encode('utf-8'))
            except Exception:
                logger.exception('Failed to send response to client')
        except Exception as e:
            logger.exception('Unhandled error in handle_client')
            try:
                error_response = {'error': str(e)}
                client_socket.send(json.dumps(error_response).encode('utf-8'))
            except Exception:
                logger.exception('Failed sending error response')
        finally:
            try:
                client_socket.close()
            except Exception:
                logger.exception('Error closing client socket')
            try:
                if addr:
                    self.connected_clients.discard((addr[0], addr[1]))
                else:
                    try:
                        peer = client_socket.getpeername()
                        self.connected_clients.discard((peer[0], peer[1]))
                    except OSError:
                        pass
                self._update_tray_menu()
            except Exception:
                logger.exception('Error cleaning up client')

    def _open_logs(self):
        """Open the log file using the platform default application."""
        try:
            log_path = Path(os.environ.get('LOCALAPPDATA', '.')) / 'HighlightAssist' / 'logs' / 'native-host.log'
            if log_path.exists():
                if sys.platform.startswith('win'):
                    os.startfile(str(log_path))
                elif sys.platform.startswith('darwin'):
                    subprocess.Popen(['open', str(log_path)])
                else:
                    subprocess.Popen(['xdg-open', str(log_path)])
            else:
                self._notify('HighlightAssist', f'Log file not found: {log_path}')
        except Exception as e:
            logger.exception('Failed opening logs: %s', e)

    def run(self):
        """Run the service manager"""
        # Create TCP server on port 5054 and store socket for shutdown
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(('127.0.0.1', SERVICE_PORT))
        server.listen(5)
        server.settimeout(1.0)
        self._server_socket = server

        logger.info('HighlightAssist Service Manager v1.0 starting')
        logger.info('Control Port: %s, Bridge Port: 5055 - listening for commands', SERVICE_PORT)

        # Install signal handlers for graceful shutdown
        def _signal_handler(signum, frame):
            logger.info('Received signal %s - shutting down', signum)
            self.running = False

        try:
            signal.signal(signal.SIGINT, _signal_handler)
            signal.signal(signal.SIGTERM, _signal_handler)
        except Exception:
            logger.debug('Signal handlers not installed')

        try:
            while self.running:
                try:
                    client, addr = server.accept()
                except socket.timeout:
                    continue
                except OSError:
                    break

                client_thread = threading.Thread(target=self.handle_client, args=(client, addr), daemon=True)
                client_thread.start()
                self._threads.append(client_thread)
        except Exception:
            logger.exception('Error in service run loop')
        finally:
            logger.info('Service manager shutting down...')
            try:
                if self._server_socket:
                    try:
                        self._server_socket.close()
                    except Exception:
                        pass
            except Exception:
                logger.exception('Error closing server socket')
            if self.bridge_process:
                try:
                    self.bridge_process.terminate()
                except Exception:
                    logger.exception('Error terminating bridge during shutdown')
            for t in self._threads:
                try:
                    if t.is_alive():
                        t.join(timeout=1.0)
                except Exception:
                    pass


if __name__ == "__main__":
    manager = ServiceManager()
    manager.run()
"""
HighlightAssist Service Manager - Windows Background Service
Similar to Bonjour/mDNS, this runs in background and launches bridge on demand
"""
import sys
import os
import subprocess
import json
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
import socket
import threading
import time
import signal
from typing import Optional

# Optional GUI / notification libs
try:
    import pystray
    from PIL import Image, ImageDraw
    HAS_TRAY = True
except Exception:
    HAS_TRAY = False

# Notification backends (platform-dependent)
HAS_PLYER = False
HAS_WIN10TOAST = False
HAS_NOTIFY2 = False
HAS_PYNC = False
try:
    from plyer import notification as plyer_notification
    HAS_PLYER = True
except Exception:
    HAS_PLYER = False

if sys.platform.startswith('win'):
    try:
        from win10toast import ToastNotifier
        HAS_WIN10TOAST = True
    except Exception:
        HAS_WIN10TOAST = False
elif sys.platform.startswith('linux'):
    try:
        import notify2
        HAS_NOTIFY2 = True
    except Exception:
        HAS_NOTIFY2 = False
elif sys.platform.startswith('darwin'):
    try:
        import pync
        HAS_PYNC = True
    except Exception:
        HAS_PYNC = False

SERVICE_PORT = 5054  # Control port (bridge runs on 5055)
BRIDGE_SCRIPT = Path(__file__).parent / "bridge.py"

# Logging setup
LOG_DIR = Path(os.environ.get('LOCALAPPDATA', '.')) / 'HighlightAssist' / 'logs'
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / 'service-manager.log'

logger = logging.getLogger('highlightassist.service')
if not logger.handlers:
    handler = RotatingFileHandler(str(LOG_FILE), maxBytes=1024 * 1024, backupCount=3, encoding='utf-8')
    formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s: %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

class ServiceManager:
    def __init__(self):
        self.bridge_process = None
        self.running = True
        self._tray_icon = None
        self.connected_clients = set()
        self._server_socket: Optional[socket.socket] = None
        self._threads: list[threading.Thread] = []
        
    def is_bridge_running(self):
        """Check if bridge is already running on port 5055"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            result = sock.connect_ex(('127.0.0.1', 5055))
            sock.close()
            return result == 0
        except Exception:
            logger.exception('Error checking bridge port')
            return False

    def start_bridge(self):
        """Start the bridge server (uvicorn bridge:app).

        Returns a small dict suitable for JSON serialization.
        """
        if self.is_bridge_running():
            return {"status": "already_running", "port": 5055}

        try:
            logger.info('Starting bridge with Python: %s', sys.executable)
            self.bridge_process = subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "bridge:app", "--host=127.0.0.1", "--port=5055"],
                cwd=Path(__file__).parent,
                creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform.startswith('win') else 0
            )

            for _ in range(10):
                if self.is_bridge_running():
                    self._notify('HighlightAssist', 'Bridge started and listening on port 5055')
                    return {"status": "started", "port": 5055, "pid": self.bridge_process.pid}
                time.sleep(0.5)

            logger.warning('Bridge start timed out')
            return {"status": "failed", "error": "timeout"}
        except Exception as e:
            logger.exception('Failed to start bridge')
            return {"status": "error", "error": str(e)}

    def stop_bridge(self):
        """Stop the bridge server"""
        if self.bridge_process:
            try:
                self.bridge_process.terminate()
                self.bridge_process.wait(timeout=5)
            except Exception:
                try:
                    self.bridge_process.kill()
                except Exception:
                    logger.exception('Failed to terminate/kill bridge process')
            finally:
                self.bridge_process = None
            self._notify('HighlightAssist', 'Bridge stopped')
            logger.info('Bridge stopped')
            return {"status": "stopped"}
        return {"status": "not_running"}

    def _notify(self, title: str, message: str) -> None:
        """Show a desktop notification using the best-available backend for the platform.

        Fallback order (best-effort): win10toast/pync/notify2 -> plyer -> system command -> logger
        """
        try:
            if sys.platform.startswith('win'):
                if HAS_WIN10TOAST:
                    try:
                        toaster = ToastNotifier()
                        toaster.show_toast(title, message, threaded=True, icon_path=None, duration=4)
                        return
                    except Exception:
                        pass
                if HAS_PLYER:
                    try:
                        plyer_notification.notify(title=title, message=message, app_name='HighlightAssist')
                        return
                    except Exception:
                        pass

            elif sys.platform.startswith('darwin'):
                if HAS_PYNC:
                    try:
                        pync.notify(message, title=title)
                        return
                    except Exception:
                        pass
                if HAS_PLYER:
                    try:
                        plyer_notification.notify(title=title, message=message, app_name='HighlightAssist')
                        return
                    except Exception:
                        pass

            else:  # linux & others
                if HAS_NOTIFY2:
                    try:
                        notify2.init('HighlightAssist')
                        n = notify2.Notification(title, message)
                        n.show()
                        return
                    except Exception:
                        pass
                if HAS_PLYER:
                    try:
                        plyer_notification.notify(title=title, message=message, app_name='HighlightAssist')
                        return
                    except Exception:
                        pass
                try:
                    subprocess.Popen(['notify-send', title, message])
                    return
                except Exception:
                    pass

            logger.info('[NOTIFY] %s: %s', title, message)
        except Exception:
            logger.exception('Notification error')

    # ---------- Tray (optional) ----------
    def _generate_icon(self, size=(64, 64)) -> Optional[Image.Image]:
        """Generate a simple tray icon using PIL (if available)."""
        if not HAS_TRAY:
            return None
        try:
            try:
                assets_dir = Path(__file__).resolve().parent.parent / 'assets'
                icon_path = assets_dir / 'icon-128.png'
                if icon_path.exists():
                    img = Image.open(str(icon_path)).convert('RGBA')
                    img = img.resize(size)
                    return img
            except Exception:
                pass

            img = Image.new('RGBA', size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)
            w, h = size
            draw.ellipse((4, 4, w-4, h-4), fill=(59,130,246, 230))
            draw.text((w//3, h//3), 'HA', fill='white')
            return img
        except Exception:
            return None

    def _create_tray(self):
        """Create and run a system tray icon with a minimal menu if pystray is available."""
        if not HAS_TRAY:
            return

        def on_stop(icon, item):
            self.stop_bridge()

        def on_manager(icon, item):
            running = self.is_bridge_running()
            self._notify('HighlightAssist', f'Bridge running: {running}')
            self._open_logs()

        def on_clients(icon, item):
            if not self.connected_clients:
                self._notify('HighlightAssist', 'No active clients')
                return
            clients = '\n'.join([f'{c[0]}:{c[1]}' for c in self.connected_clients])
            if len(clients) > 400:
                clients = clients[:400] + '\n…'
            self._notify('HighlightAssist', f'Clients:\n{clients}')

        def on_logs(icon, item):
            self._open_logs()

        def on_quit(icon, item):
            logger.info('Tray requested quit')
            self.running = False
            try:
                if self.bridge_process:
                    self.bridge_process.terminate()
            except Exception:
                logger.exception('Error terminating bridge during quit')
            try:
                icon.stop()
            except Exception:
                logger.exception('Error stopping tray icon')

        icon_image = self._generate_icon((64, 64)) or Image.new('RGBA', (64, 64), (59,130,246,255))

        def connections_label():
            if not self.connected_clients:
                return 'No connections'
            return f'{len(self.connected_clients)} connection(s)'

        def build_menu():
            return pystray.Menu(
                pystray.MenuItem(lambda: connections_label(), None, enabled=False),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem('Stop Server', on_stop),
                pystray.MenuItem('Manager...', on_manager),
                pystray.MenuItem('Client...', on_clients),
                pystray.MenuItem('Logs...', on_logs),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem('Exit', on_quit)
            )

        menu = build_menu()
        self._tray_icon = pystray.Icon('highlightassist', icon_image, 'HighlightAssist', menu)
        t = threading.Thread(target=self._tray_icon.run, daemon=True)
        t.start()
        self._threads.append(t)
        self._tray_menu_builder = build_menu

    def _update_tray_menu(self) -> None:
        """Rebuild tray menu to reflect updated connection count."""
        if not HAS_TRAY or not self._tray_icon:
            return
        try:
            new_menu = self._tray_menu_builder()
            self._tray_icon.menu = new_menu
            if hasattr(self._tray_icon, 'update_menu'):
                try:
                    self._tray_icon.update_menu()
                except Exception:
                    pass
        except Exception:
            logger.exception('Failed updating tray menu')

    def handle_client(self, client_socket, addr=None):
        """Handle commands from extension"""
        try:
            try:
                if addr:
                    self.connected_clients.add((addr[0], addr[1]))
                else:
                    try:
                        peer = client_socket.getpeername()
                        self.connected_clients.add((peer[0], peer[1]))
                    except OSError:
                        pass
                self._update_tray_menu()
            except Exception:
                logger.exception('Error registering client')

            data = b''
            try:
                data = client_socket.recv(8192)
            except Exception:
                logger.exception('Error reading from client socket')
            if not data:
                logger.debug('No data received from client')
                client_socket.close()
                return

            try:
                command = json.loads(data.decode('utf-8', errors='ignore'))
            except json.JSONDecodeError:
                logger.warning('Invalid JSON from client: %s', data[:200])
                try:
                    client_socket.send(json.dumps({'error': 'invalid_json'}).encode('utf-8'))
                except Exception:
                    logger.exception('Failed to send invalid_json response')
                client_socket.close()
                return

            action = command.get('action')
            if action == 'start':
                response = self.start_bridge()
            elif action == 'stop':
                response = self.stop_bridge()
            elif action == 'status':
                response = {
                    'running': self.is_bridge_running(),
                    'port': 5055
                }
            else:
                response = {'error': 'unknown_command'}

            try:
                client_socket.send(json.dumps(response).encode('utf-8'))
            except Exception:
                logger.exception('Failed to send response to client')
        except Exception as e:
            logger.exception('Unhandled error in handle_client')
            try:
                error_response = {'error': str(e)}
                client_socket.send(json.dumps(error_response).encode('utf-8'))
            except Exception:
                logger.exception('Failed sending error response')
        finally:
            try:
                client_socket.close()
            except Exception:
                logger.exception('Error closing client socket')
            try:
                if addr:
                    self.connected_clients.discard((addr[0], addr[1]))
                else:
                    try:
                        peer = client_socket.getpeername()
                        self.connected_clients.discard((peer[0], peer[1]))
                    except OSError:
                        pass
                self._update_tray_menu()
            except Exception:
                logger.exception('Error cleaning up client')

    def _open_logs(self):
        """Open the log file using the platform default application."""
        try:
            log_path = Path(os.environ.get('LOCALAPPDATA', '.')) / 'HighlightAssist' / 'logs' / 'native-host.log'
            if log_path.exists():
                if sys.platform.startswith('win'):
                    os.startfile(str(log_path))
                elif sys.platform.startswith('darwin'):
                    subprocess.Popen(['open', str(log_path)])
                else:
                    subprocess.Popen(['xdg-open', str(log_path)])
            else:
                self._notify('HighlightAssist', f'Log file not found: {log_path}')
        except Exception as e:
            logger.exception('Failed opening logs: %s', e)

    def run(self):
        """Run the service manager"""
        # Create TCP server on port 5054 and store socket for shutdown
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(('127.0.0.1', SERVICE_PORT))
        server.listen(5)
        server.settimeout(1.0)
        self._server_socket = server

        logger.info('HighlightAssist Service Manager v1.0 starting')
        logger.info('Control Port: %s, Bridge Port: 5055 - listening for commands', SERVICE_PORT)

        # Install signal handlers for graceful shutdown
        def _signal_handler(signum, frame):
            logger.info('Received signal %s - shutting down', signum)
            self.running = False

        try:
            signal.signal(signal.SIGINT, _signal_handler)
            signal.signal(signal.SIGTERM, _signal_handler)
        except Exception:
            logger.debug('Signal handlers not installed')

        try:
            while self.running:
                try:
                    client, addr = server.accept()
                except socket.timeout:
                    continue
                except OSError:
                    break

                client_thread = threading.Thread(target=self.handle_client, args=(client, addr), daemon=True)
                client_thread.start()
                self._threads.append(client_thread)
        except Exception:
            logger.exception('Error in service run loop')
        finally:
            logger.info('Service manager shutting down...')
            try:
                if self._server_socket:
                    try:
                        self._server_socket.close()
                    except Exception:
                        pass
            except Exception:
                logger.exception('Error closing server socket')
            if self.bridge_process:
                try:
                    self.bridge_process.terminate()
                except Exception:
                    logger.exception('Error terminating bridge during shutdown')
            for t in self._threads:
                try:
                    if t.is_alive():
                        t.join(timeout=1.0)
                except Exception:
                    pass


if __name__ == "__main__":
    manager = ServiceManager()
    manager.run()
