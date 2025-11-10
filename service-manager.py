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

SERVICE_PORT = 5054  # Control port (bridge runs on 5055)
BRIDGE_SCRIPT = Path(__file__).parent / "bridge.py"

class ServiceManager:
    def __init__(self):
        self.bridge_process = None
        self.running = True
        
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
                    return {"status": "started", "port": 5055, "pid": self.bridge_process.pid}
                time.sleep(0.5)
            
            return {"status": "failed", "error": "timeout"}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def stop_bridge(self):
        """Stop the bridge server"""
        if self.bridge_process:
            self.bridge_process.terminate()
            self.bridge_process = None
            return {"status": "stopped"}
        return {"status": "not_running"}
    
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
