"""
HighlightAssist Service Manager - Windows Background Service
Similar to Bonjour/mDNS, this runs in background and launches bridge on demand
"""
import sys
import os
import subprocess
import json
from pathlib import Path
import socket
import threading
import time
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

class ServiceManager:
    def __init__(self):
        self.bridge_process = None
        self.running = True
        self._tray_icon = None
        self.connected_clients = set()
        
    def is_bridge_running(self):
        """Check if bridge is already running on port 5055"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            result = sock.connect_ex(('127.0.0.1', 5055))
            sock.close()
            return result == 0
        except:
            return False
    
    def start_bridge(self):
        """Start the bridge server"""
        if self.is_bridge_running():
            return {"status": "already_running", "port": 5055}
        
        try:
            # Start bridge process
            creationflags = 0
            popen_kwargs = dict(cwd=Path(__file__).parent)
            if sys.platform.startswith('win') and hasattr(subprocess, 'CREATE_NEW_CONSOLE'):
                popen_kwargs['creationflags'] = subprocess.CREATE_NEW_CONSOLE

            self.bridge_process = subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "bridge:app", "--host=127.0.0.1", "--port=5055"],
                **popen_kwargs
            )
            
            # Wait for bridge to start
            for _ in range(10):
                if self.is_bridge_running():
                    # Notify user via tray/notification
                    self._notify('HighlightAssist', 'Bridge started and listening on port 5055')
                    return {"status": "started", "port": 5055, "pid": self.bridge_process.pid}
                time.sleep(0.5)
            self._notify('HighlightAssist', 'Bridge start timed out')
            return {"status": "failed", "error": "timeout"}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def stop_bridge(self):
        """Stop the bridge server"""
        if self.bridge_process:
            self.bridge_process.terminate()
            self.bridge_process = None
            self._notify('HighlightAssist', 'Bridge stopped')
            return {"status": "stopped"}
        return {"status": "not_running"}

    def _generate_icon(self, size=(64, 64)) -> Optional[Image.Image]:
        """Generate a simple tray icon using PIL (if available)."""
        if not HAS_TRAY:
            return None
        try:
            # Prefer a repo-provided icon asset if present
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
            # Draw a simple circular icon with HA initials
            w, h = size
            draw.ellipse((4, 4, w-4, h-4), fill=(59,130,246, 230))
            draw.text((w//3, h//3), 'HA', fill='white')
            return img
        except Exception:
            return None

    def _notify(self, title: str, message: str) -> None:
        """Show a desktop notification using the best-available backend for the platform.

        Fallback order:
        - Windows: win10toast -> plyer -> print
        - macOS: pync -> plyer -> print
        - Linux: notify2 -> plyer -> notify-send subprocess -> print
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
                # try notify-send as a last resort
                try:
                    subprocess.Popen(['notify-send', title, message])
                    return
                except Exception:
                    pass

            # Final fallback to console
            print(f"[NOTIFY] {title}: {message}")
        except Exception:
            # Never raise from notifications
            try:
                print(f"[NOTIFY] {title}: {message}")
            except Exception:
                pass

    def _create_tray(self):
        """Create and run a system tray icon with a minimal menu if pystray is available."""
        if not HAS_TRAY:
            return
        def on_stop(icon, item):
            self.stop_bridge()

        def on_manager(icon, item):
            # Show manager status and open logs
            running = self.is_bridge_running()
            self._notify('HighlightAssist', f'Bridge running: {running}')
            self._open_logs()

        def on_clients(icon, item):
            # Show connected clients via notification (or open a small temp file)
            if not self.connected_clients:
                self._notify('HighlightAssist', 'No active clients')
                return
            clients = '\n'.join([f'{c[0]}:{c[1]}' for c in self.connected_clients])
            # If message too long, truncate
            if len(clients) > 400:
                clients = clients[:400] + '\n…'
            self._notify('HighlightAssist', f'Clients:\n{clients}')

        def on_logs(icon, item):
            self._open_logs()

        def on_quit(icon, item):
            self.running = False
            try:
                if self.bridge_process:
                    self.bridge_process.terminate()
            except Exception:
                pass
            icon.stop()

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
        # Run the icon (this blocks until stopped) in a background thread
        threading.Thread(target=self._tray_icon.run, daemon=True).start()

        # store builder so we can refresh later
        self._tray_menu_builder = build_menu

    def _update_tray_menu(self) -> None:
        """Rebuild tray menu to reflect updated connection count."""
        if not HAS_TRAY or not self._tray_icon:
            return
        try:
            new_menu = self._tray_menu_builder()
            # pystray may accept setting menu directly
            self._tray_icon.menu = new_menu
            # call update_menu if available
            if hasattr(self._tray_icon, 'update_menu'):
                try:
                    self._tray_icon.update_menu()
                except Exception:
                    pass
        except Exception:
            pass
    
    def handle_client(self, client_socket, addr=None):
        """Handle commands from extension"""
        try:
            # record client address
            try:
                if addr:
                    self.connected_clients.add((addr[0], addr[1]))
                else:
                    peer = client_socket.getpeername()
                    self.connected_clients.add((peer[0], peer[1]))
                # update tray menu
                self._update_tray_menu()
            except Exception:
                pass
            data = client_socket.recv(1024).decode('utf-8')
            command = json.loads(data)
            
            if command.get("action") == "start":
                response = self.start_bridge()
            elif command.get("action") == "stop":
                response = self.stop_bridge()
            elif command.get("action") == "status":
                response = {
                    "running": self.is_bridge_running(),
                    "port": 5055
                }
            else:
                response = {"error": "unknown_command"}
            
            client_socket.send(json.dumps(response).encode('utf-8'))
        except Exception as e:
            error_response = {"error": str(e)}
            client_socket.send(json.dumps(error_response).encode('utf-8'))
        finally:
            client_socket.close()
            # remove client from active set
            try:
                if addr:
                    self.connected_clients.discard((addr[0], addr[1]))
                else:
                    peer = client_socket.getpeername()
                    self.connected_clients.discard((peer[0], peer[1]))
                self._update_tray_menu()
            except Exception:
                pass

    def _open_logs(self):
        """Open the log file using the platform default application."""
        try:
            log_path = str(Path(os.environ.get('LOCALAPPDATA', Path('.'))) / 'HighlightAssist' / 'logs' / 'native-host.log')
            if os.path.exists(log_path):
                if sys.platform.startswith('win'):
                    os.startfile(log_path)
                elif sys.platform.startswith('darwin'):
                    subprocess.Popen(['open', log_path])
                else:
                    subprocess.Popen(['xdg-open', log_path])
            else:
                self._notify('HighlightAssist', f'Log file not found: {log_path}')
        except Exception as e:
            print('Failed opening logs:', e)
    
    def run(self):
        """Run the service manager"""
        # Create TCP server on port 5054
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(('127.0.0.1', SERVICE_PORT))
        server.listen(5)
        
        print(f"""

     HighlightAssist Service Manager v1.0                  


 Control Port: {SERVICE_PORT}
 Bridge Port: 5055
 Status: Listening for commands...

Extension can now auto-start the bridge!
Minimize this window - service runs in background.
""")
        
        while self.running:
            try:
                client, addr = server.accept()
                client_thread = threading.Thread(
                    target=self.handle_client, 
                    args=(client,)
                )
                client_thread.start()
            except KeyboardInterrupt:
                print("\n Shutting down service...")
                self.running = False
                if self.bridge_process:
                    self.bridge_process.terminate()

if __name__ == "__main__":
    manager = ServiceManager()
    manager.run()
