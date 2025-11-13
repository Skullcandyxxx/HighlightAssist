"""
HighlightAssist WebSocket Bridge
Maintains persistent WebSocket connections and coordinates between extension and services
"""
# Prevent __pycache__ creation (must be before other imports)
import sys
sys.dont_write_bytecode = True

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import json
import asyncio
from datetime import datetime
from typing import Dict, List
import os

app = FastAPI(title="HighlightAssist Bridge")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active WebSocket connections
active_connections: List[WebSocket] = []

# Connection metadata
connection_info: Dict[WebSocket, dict] = {}


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_metadata: Dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket, client_info: dict = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_metadata[websocket] = {
            "connected_at": datetime.now().isoformat(),
            "client_info": client_info or {},
            "messages_sent": 0,
            "messages_received": 0
        }
        print(f"✅ WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.connection_metadata:
            metadata = self.connection_metadata.pop(websocket)
            print(f"👋 WebSocket disconnected. Messages: {metadata['messages_received']} in, {metadata['messages_sent']} out")
        print(f"📊 Active connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        if websocket in self.connection_metadata:
            self.connection_metadata[websocket]["messages_sent"] += 1
        await websocket.send_json(message)

    async def broadcast(self, message: dict):
        """Send message to all connected clients"""
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
                if connection in self.connection_metadata:
                    self.connection_metadata[connection]["messages_sent"] += 1
            except Exception as e:
                print(f"❌ Error broadcasting to connection: {e}")


manager = ConnectionManager()


@app.get("/")
async def root():
    return {
        "service": "HighlightAssist WebSocket Bridge",
        "status": "running",
        "active_connections": len(manager.active_connections),
        "endpoints": {
            "websocket": "/ws",
            "health": "/health",
            "stats": "/stats"
        }
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "active_connections": len(manager.active_connections),
        "uptime": "running"
    }


@app.get("/stats")
async def stats():
    """Get statistics about active connections"""
    connections = []
    for ws, metadata in manager.connection_metadata.items():
        connections.append({
            "connected_at": metadata["connected_at"],
            "messages_sent": metadata["messages_sent"],
            "messages_received": metadata["messages_received"],
            "client_info": metadata.get("client_info", {})
        })
    
    return {
        "total_connections": len(manager.active_connections),
        "connections": connections
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint for browser extension"""
    await manager.connect(websocket)
    
    try:
        # Send welcome message
        await manager.send_personal_message({
            "type": "connection",
            "status": "connected",
            "message": "Connected to HighlightAssist Bridge",
            "timestamp": datetime.now().isoformat()
        }, websocket)
        
        while True:
            # Receive message from extension
            data = await websocket.receive_json()
            
            if websocket in manager.connection_metadata:
                manager.connection_metadata[websocket]["messages_received"] += 1
            
            message_type = data.get("type", "unknown")
            print(f"📨 Received message: {message_type}")
            
            # Log AI requests with full details for AI monitoring
            if message_type == "ai_request":
                print(f"🤖 AI Command: {data.get('command', 'No command')}")
                print(f"📋 Element Context:")
                context = data.get('context', {})
                if context:
                    print(f"   Tag: {context.get('tag', 'N/A')}")
                    print(f"   Classes: {context.get('classes', 'N/A')}")
                    print(f"   ID: {context.get('id', 'N/A')}")
                    print(f"   Text: {context.get('text', 'N/A')[:100]}...")  # First 100 chars
                    if context.get('attributes'):
                        print(f"   Attributes: {context.get('attributes')}")
                print(f"⏰ Timestamp: {data.get('timestamp', 'N/A')}")
                print("-" * 60)
            
            # Process different message types
            if message_type == "ping":
                await manager.send_personal_message({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                }, websocket)
            
            elif message_type == "element_analysis":
                # Element analysis request from extension
                print(f"🔍 Element analysis: {data.get('selector', 'unknown')}")
                
                # Echo back for now (future: forward to AI service)
                await manager.send_personal_message({
                    "type": "analysis_received",
                    "status": "ok",
                    "message": "Analysis received, processing...",
                    "requestId": data.get("requestId"),
                    "timestamp": datetime.now().isoformat()
                }, websocket)
                
                # Simulate AI processing (replace with actual AI integration)
                await asyncio.sleep(0.5)
                
                # Send enhanced analysis back
                await manager.send_personal_message({
                    "type": "analysis_complete",
                    "requestId": data.get("requestId"),
                    "enhancedAnalysis": {
                        "aiSuggestions": [
                            "Consider using semantic HTML5 elements",
                            "Add ARIA labels for better screen reader support"
                        ],
                        "codeExamples": [
                            "<!-- Use <nav> instead of <div class='navigation'> -->"
                        ]
                    },
                    "timestamp": datetime.now().isoformat()
                }, websocket)
            
            elif message_type == "get_instances":
                # Request for available dev server instances
                instances = []
                ports_file = os.path.join(os.path.dirname(__file__), '.highlight-ports.json')
                
                if os.path.exists(ports_file):
                    with open(ports_file, 'r') as f:
                        config = json.load(f)
                        instances = config.get('instances', [])
                
                await manager.send_personal_message({
                    "type": "instances",
                    "instances": instances,
                    "timestamp": datetime.now().isoformat()
                }, websocket)
            
            elif message_type == "execute_command":
                # Execute command in specified directory
                print(f"🚀 Command execution request received")
                command_data = data.get('data', {})
                command = command_data.get('command', '')
                cwd = command_data.get('cwd', '')
                port = command_data.get('port', 3000)
                
                print(f"   Command: {command}")
                print(f"   Working Directory: {cwd}")
                print(f"   Expected Port: {port}")
                
                try:
                    import subprocess
                    import platform
                    
                    is_windows = platform.system() == 'Windows'
                    
                    if is_windows:
                        # Windows: Start detached process without visible window
                        # Use CREATE_NEW_CONSOLE + DETACHED_PROCESS flags
                        startupinfo = subprocess.STARTUPINFO()
                        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                        startupinfo.wShowWindow = subprocess.SW_HIDE
                        
                        # Start detached process (no command window)
                        process = subprocess.Popen(
                            command,
                            cwd=cwd,
                            shell=True,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE,
                            startupinfo=startupinfo,
                            creationflags=subprocess.CREATE_NEW_CONSOLE | subprocess.DETACHED_PROCESS,
                            text=True
                        )
                    else:
                        # Linux/macOS: Use nohup for detached background process
                        process = subprocess.Popen(
                            command,
                            cwd=cwd,
                            shell=True,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE,
                            preexec_fn=os.setpgrp if hasattr(os, 'setpgrp') else None,
                            text=True
                        )
                    
                    print(f"✅ Background process started with PID: {process.pid}")
                    print(f"   No command window will appear - runs silently in background")
                    
                    await manager.send_personal_message({
                        "type": "command_started",
                        "pid": process.pid,
                        "port": port,
                        "message": "Server started in background (no command window)",
                        "timestamp": datetime.now().isoformat()
                    }, websocket)
                    
                except Exception as e:
                    print(f"❌ Command execution failed: {e}")
                    await manager.send_personal_message({
                        "type": "command_error",
                        "error": str(e),
                        "timestamp": datetime.now().isoformat()
                    }, websocket)
            
            elif message_type == "stop_server":
                # Stop a running server process
                print(f"🛑 Stop server request received")
                stop_data = data.get('data', {})
                pid = stop_data.get('pid')
                port = stop_data.get('port')
                
                print(f"   PID: {pid}")
                print(f"   Port: {port}")
                
                try:
                    import subprocess
                    import platform
                    import signal
                    
                    is_windows = platform.system() == 'Windows'
                    
                    if is_windows:
                        # Windows: Use taskkill to stop process tree
                        subprocess.run(['taskkill', '/F', '/T', '/PID', str(pid)], 
                                     capture_output=True, 
                                     check=False)
                        print(f"✅ Process {pid} stopped (Windows taskkill)")
                    else:
                        # Linux/macOS: Send SIGTERM then SIGKILL
                        try:
                            os.kill(pid, signal.SIGTERM)
                            # Wait briefly, then force kill if needed
                            import time
                            time.sleep(0.5)
                            os.kill(pid, signal.SIGKILL)
                            print(f"✅ Process {pid} stopped (Unix kill)")
                        except ProcessLookupError:
                            print(f"⚠️ Process {pid} already terminated")
                    
                    await manager.send_personal_message({
                        "type": "server_stopped",
                        "pid": pid,
                        "port": port,
                        "success": True,
                        "timestamp": datetime.now().isoformat()
                    }, websocket)
                    
                except Exception as e:
                    print(f"❌ Failed to stop server: {e}")
                    await manager.send_personal_message({
                        "type": "server_stopped",
                        "pid": pid,
                        "port": port,
                        "success": False,
                        "error": str(e),
                        "timestamp": datetime.now().isoformat()
                    }, websocket)
            
            elif message_type == "shutdown":
                # Shutdown request from extension (bridge only)
                print("🛑 Bridge shutdown requested via WebSocket")
                
                await manager.send_personal_message({
                    "type": "shutdown_ack",
                    "message": "Bridge shutting down",
                    "timestamp": datetime.now().isoformat()
                }, websocket)
                
                # Close all connections and exit
                for connection in manager.active_connections.copy():
                    try:
                        await connection.close()
                    except:
                        pass
                
                # Exit the bridge process
                import sys
                sys.exit(0)
            
            elif message_type == "shutdown_service_manager":
                # Shutdown the entire service manager (not just bridge)
                print("🛑 Service manager shutdown requested via WebSocket")
                
                await manager.send_personal_message({
                    "type": "shutdown_ack",
                    "message": "Service manager shutting down",
                    "timestamp": datetime.now().isoformat()
                }, websocket)
                
                # Send shutdown command to service manager via TCP
                try:
                    import socket
                    import json
                    
                    # Connect to service manager TCP control port
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(2)
                    sock.connect(('localhost', 5054))
                    
                    # Send shutdown command
                    command = json.dumps({'action': 'shutdown'}) + '\n'
                    sock.sendall(command.encode('utf-8'))
                    
                    # Receive response
                    response = sock.recv(1024).decode('utf-8')
                    print(f"Service manager response: {response}")
                    
                    sock.close()
                    
                    # The service manager will stop both itself and the bridge
                    print("✅ Shutdown command sent to service manager")
                    
                except Exception as e:
                    print(f"❌ Failed to shutdown service manager: {e}")
                    # If TCP fails, just exit the bridge
                    import sys
                    sys.exit(0)
            
            elif message_type == "auto_detect_project":
                # Auto-detect project type from folder path
                print(f"🔍 Auto-detect project request received")
                detect_data = data.get('data', {})
                project_path = detect_data.get('path', '')
                
                print(f"   Scanning: {project_path}")
                
                try:
                    import os
                    import json
                    
                    detected_type = "Unknown"
                    detected_command = "npm run dev"
                    detected_port = 3000
                    detected_venv = None
                    
                    # Check for package.json (Node.js project)
                    package_json = os.path.join(project_path, 'package.json')
                    if os.path.exists(package_json):
                        with open(package_json, 'r') as f:
                            pkg = json.load(f)
                            scripts = pkg.get('scripts', {})
                            
                            if 'dev' in scripts:
                                detected_command = 'npm run dev'
                                detected_type = 'Node.js (npm)'
                                # Detect Vite (port 5173)
                                if 'vite' in scripts.get('dev', '').lower():
                                    detected_port = 5173
                                    detected_type = 'Vite'
                            elif 'start' in scripts:
                                detected_command = 'npm start'
                                detected_type = 'Node.js (npm)'
                            
                            # Check if using yarn/pnpm
                            if os.path.exists(os.path.join(project_path, 'yarn.lock')):
                                detected_command = detected_command.replace('npm', 'yarn')
                                detected_type = detected_type.replace('npm', 'yarn')
                            elif os.path.exists(os.path.join(project_path, 'pnpm-lock.yaml')):
                                detected_command = detected_command.replace('npm', 'pnpm')
                                detected_type = detected_type.replace('npm', 'pnpm')
                    
                    # Check for Python virtual environment
                    venv_paths = ['.venv', 'venv', 'env']
                    for venv_name in venv_paths:
                        venv_path = os.path.join(project_path, venv_name)
                        if os.path.isdir(venv_path):
                            detected_venv = venv_name
                            break
                    
                    # Check for Python project files
                    if os.path.exists(os.path.join(project_path, 'manage.py')):
                        # Django project
                        detected_type = 'Django'
                        if detected_venv:
                            if platform.system() == 'Windows':
                                detected_command = f'{detected_venv}\\Scripts\\python.exe manage.py runserver'
                            else:
                                detected_command = f'{detected_venv}/bin/python manage.py runserver'
                        else:
                            detected_command = 'python manage.py runserver'
                        detected_port = 8000
                    
                    elif os.path.exists(os.path.join(project_path, 'app.py')) or \
                         os.path.exists(os.path.join(project_path, 'main.py')):
                        # Flask/FastAPI project
                        detected_type = 'Python (Flask/FastAPI)'
                        main_file = 'app.py' if os.path.exists(os.path.join(project_path, 'app.py')) else 'main.py'
                        
                        if detected_venv:
                            if platform.system() == 'Windows':
                                detected_command = f'{detected_venv}\\Scripts\\python.exe {main_file}'
                            else:
                                detected_command = f'{detected_venv}/bin/python {main_file}'
                        else:
                            detected_command = f'python {main_file}'
                        detected_port = 5000
                    
                    print(f"✅ Detected: {detected_type}")
                    print(f"   Command: {detected_command}")
                    print(f"   Port: {detected_port}")
                    if detected_venv:
                        print(f"   Virtual Env: {detected_venv}")
                    
                    await manager.send_personal_message({
                        "type": "project_detected",
                        "data": {
                            "projectType": detected_type,
                            "command": detected_command,
                            "port": detected_port,
                            "venv": detected_venv
                        },
                        "timestamp": datetime.now().isoformat()
                    }, websocket)
                    
                except Exception as e:
                    print(f"❌ Auto-detect failed: {e}")
                    await manager.send_personal_message({
                        "type": "error",
                        "message": f"Failed to detect project type: {str(e)}",
                        "timestamp": datetime.now().isoformat()
                    }, websocket)
            
            elif message_type == "broadcast":
                # Broadcast to all connected clients
                await manager.broadcast({
                    "type": "broadcast_message",
                    "data": data.get("data"),
                    "from": "bridge",
                    "timestamp": datetime.now().isoformat()
                })
            
            else:
                # Unknown message type
                await manager.send_personal_message({
                    "type": "error",
                    "message": f"Unknown message type: {message_type}",
                    "timestamp": datetime.now().isoformat()
                }, websocket)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("🔌 Client disconnected normally")
    
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        manager.disconnect(websocket)


@app.post("/shutdown")
async def shutdown(token: str = None):
    """Graceful shutdown endpoint"""
    expected_token = os.getenv("BRIDGE_TOKEN", "dev-token-change-me")
    
    if token != expected_token:
        return {"status": "error", "message": "Invalid token"}
    
    print("🛑 Shutdown requested, closing all connections...")
    
    # Close all WebSocket connections
    for connection in manager.active_connections.copy():
        try:
            await manager.send_personal_message({
                "type": "server_shutdown",
                "message": "Server is shutting down",
                "timestamp": datetime.now().isoformat()
            }, connection)
            await connection.close()
        except Exception as e:
            print(f"Error closing connection: {e}")
    
    return {"status": "ok", "message": "Shutdown initiated"}


if __name__ == "__main__":
    # Get configuration from environment
    host = os.getenv("BRIDGE_HOST", "127.0.0.1")
    port = int(os.getenv("BRIDGE_PORT", "5055"))
    
    print(f"""
╔═══════════════════════════════════════════════════════════╗
║        HighlightAssist WebSocket Bridge v1.0              ║
╚═══════════════════════════════════════════════════════════╝
    
🌐 Host: {host}
📡 Port: {port}
🔌 WebSocket: ws://{host}:{port}/ws
❤️  Health: http://{host}:{port}/health
📊 Stats: http://{host}:{port}/stats

Waiting for connections...
""")
    
    uvicorn.run(app, host=host, port=port)
