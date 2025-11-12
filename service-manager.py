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

try:
    from plyer import notification as plyer_notification
    HAS_NOTIFY = True
except Exception:
    HAS_NOTIFY = False

SERVICE_PORT = 5054  # Control port (bridge runs on 5055)
BRIDGE_SCRIPT = Path(__file__).parent / "bridge.py"

class ServiceManager:
    def __init__(self):
        self.bridge_process = None
        self.running = True
        self._tray_icon = None
        
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
            self.bridge_process = subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "bridge:app", 
                 "--host=127.0.0.1", "--port=5055"],
                cwd=Path(__file__).parent,
                creationflags=subprocess.CREATE_NEW_CONSOLE
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
        """Show a desktop notification using plyer (fallback to console)."""
        try:
            if HAS_NOTIFY:
                plyer_notification.notify(title=title, message=message, app_name='HighlightAssist')
            else:
                # On Windows try win32api balloon (not required) - fallback to print
                print(f"[NOTIFY] {title}: {message}")
        except Exception:
            print(f"[NOTIFY] {title}: {message}")

    def _create_tray(self):
        """Create and run a system tray icon with a minimal menu if pystray is available."""
        if not HAS_TRAY:
            return

        def on_start(icon, item):
            self.start_bridge()

        def on_stop(icon, item):
            self.stop_bridge()

        def on_status(icon, item):
            running = self.is_bridge_running()
            self._notify('HighlightAssist', f'Bridge running: {running}')

        def on_quit(icon, item):
            self.running = False
            try:
                if self.bridge_process:
                    self.bridge_process.terminate()
            except Exception:
                pass
            icon.stop()

        icon_image = self._generate_icon((64, 64)) or Image.new('RGBA', (64, 64), (59,130,246,255))
        menu = pystray.Menu(
            pystray.MenuItem('Start Bridge', on_start),
            pystray.MenuItem('Stop Bridge', on_stop),
            pystray.MenuItem('Status', on_status),
            pystray.MenuItem('Quit', on_quit)
        )

        self._tray_icon = pystray.Icon('highlightassist', icon_image, 'HighlightAssist', menu)
        # Run the icon (this blocks until stopped) in a background thread
        threading.Thread(target=self._tray_icon.run, daemon=True).start()
    
    def handle_client(self, client_socket):
        """Handle commands from extension"""
        try:
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
