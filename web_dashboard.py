"""
HighlightAssist Web Dashboard
A local web interface for managing the HighlightAssist daemon
Similar to Unified Remote's clean UI design
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
import asyncio
import logging
from pathlib import Path
from typing import Optional, Dict, List
import socket
import time

# Optional dependencies - graceful degradation
try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False
    print("⚠️  psutil not available - system stats disabled")

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="HighlightAssist Dashboard")

# Setup templates directory with PyInstaller support
def get_resource_path(relative_path: str) -> Path:
    """Get absolute path to resource, works for dev and PyInstaller"""
    import sys
    import os
    
    if getattr(sys, 'frozen', False):
        # Running in PyInstaller bundle
        base_path = Path(sys._MEIPASS)
    else:
        # Running in normal Python environment
        base_path = Path(__file__).parent
    
    return base_path / relative_path

DASHBOARD_DIR = get_resource_path("dashboard")
if not DASHBOARD_DIR.exists():
    # Fallback: create dashboard directory if it doesn't exist
    DASHBOARD_DIR = Path(__file__).parent / "dashboard"
    DASHBOARD_DIR.mkdir(exist_ok=True)

# Static files and templates
templates = Jinja2Templates(directory=str(DASHBOARD_DIR))

# Global references (will be injected from service_manager)
service_manager = None
bridge_controller = None
project_manager = None

class DashboardManager:
    """Manages the web dashboard interface"""
    
    def __init__(self, service_mgr=None):
        global service_manager, bridge_controller, project_manager
        service_manager = service_mgr
        if service_mgr:
            bridge_controller = service_mgr.bridge
            project_manager = getattr(service_mgr, 'project_manager', None)
        
        self.active_connections: List[WebSocket] = []
        self.host = "127.0.0.1"
        self.port = 9999
        
    async def broadcast_status(self, data: dict):
        """Broadcast status updates to all connected clients"""
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except:
                pass
    
    def get_system_status(self) -> dict:
        """Get comprehensive system status"""
        status = {
            "daemon": {
                "running": True,
                "uptime": self._get_uptime(),
                "cpu_usage": self._get_cpu_usage(),
                "memory_usage": self._get_memory_usage()
            },
            "bridge": {
                "running": bridge_controller.is_running if bridge_controller else False,
                "port": 5055,
                "auto_start": self._get_auto_start_status()
            },
            "servers": self._get_running_servers(),
            "projects": self._get_recent_projects()
        }
        return status
    
    def _get_cpu_usage(self) -> float:
        """Get CPU usage (returns 0 if psutil not available)"""
        if HAS_PSUTIL:
            try:
                return psutil.cpu_percent(interval=0.1)
            except:
                return 0.0
        return 0.0
    
    def _get_memory_usage(self) -> float:
        """Get memory usage (returns 0 if psutil not available)"""
        if HAS_PSUTIL:
            try:
                return psutil.virtual_memory().percent
            except:
                return 0.0
        return 0.0
    
    def _get_uptime(self) -> str:
        """Get daemon uptime"""
        if not HAS_PSUTIL:
            return "N/A"
        
        try:
            import os
            uptime_seconds = time.time() - psutil.Process(os.getpid()).create_time()
            hours = int(uptime_seconds // 3600)
            minutes = int((uptime_seconds % 3600) // 60)
            return f"{hours}h {minutes}m"
        except:
            return "Unknown"
    
    def _get_auto_start_status(self) -> bool:
        """Check if auto-start is enabled"""
        if bridge_controller:
            return getattr(bridge_controller, 'auto_start_enabled', False)
        return False
    
    def _get_running_servers(self) -> List[dict]:
        """Get list of running dev servers"""
        servers = []
        common_ports = [3000, 3001, 3002, 4200, 5000, 5173, 8000, 8080, 9000]
        
        for port in common_ports:
            if self._is_port_open(port):
                server_info = {
                    "port": port,
                    "name": f"Server on :{port}",
                    "url": f"http://localhost:{port}",
                    "status": "running"
                }
                
                # Try to match to known project
                if project_manager:
                    for project in project_manager.projects:
                        if project.get('dev_port') == port:
                            server_info['name'] = project.get('name', server_info['name'])
                            server_info['path'] = project.get('path', '')
                            break
                
                servers.append(server_info)
        
        return servers
    
    def _get_recent_projects(self) -> List[dict]:
        """Get recent projects"""
        if project_manager:
            return project_manager.projects[:10]
        return []
    
    def _is_port_open(self, port: int) -> bool:
        """Check if port is open (IPv4 or IPv6)"""
        # Try IPv4
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.3)
                if s.connect_ex(('127.0.0.1', port)) == 0:
                    return True
        except:
            pass
        
        # Try IPv6
        try:
            with socket.socket(socket.AF_INET6, socket.SOCK_STREAM) as s:
                s.settimeout(0.3)
                return s.connect_ex(('::1', port)) == 0
        except:
            return False
    
    async def start(self):
        """Start the dashboard server"""
        config = uvicorn.Config(
            app,
            host=self.host,
            port=self.port,
            log_level="info",
            access_log=False
        )
        server = uvicorn.Server(config)
        logger.info(f"Starting dashboard on http://{self.host}:{self.port}")
        await server.serve()


# === Routes ===

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Main dashboard page"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/status")
async def get_status():
    """Get current status"""
    if service_manager and hasattr(service_manager, 'dashboard'):
        status = service_manager.dashboard.get_system_status()
        return JSONResponse(status)
    return JSONResponse({"error": "Service manager not initialized"}, status_code=500)

@app.post("/api/bridge/start")
async def start_bridge():
    """Start the bridge"""
    if bridge_controller:
        success = bridge_controller.start()
        return JSONResponse({"success": success, "message": "Bridge started" if success else "Failed to start bridge"})
    return JSONResponse({"success": False, "message": "Bridge controller not available"}, status_code=500)

@app.post("/api/bridge/stop")
async def stop_bridge():
    """Stop the bridge"""
    if bridge_controller:
        bridge_controller.stop()
        return JSONResponse({"success": True, "message": "Bridge stopped"})
    return JSONResponse({"success": False, "message": "Bridge controller not available"}, status_code=500)

@app.post("/api/bridge/restart")
async def restart_bridge():
    """Restart the bridge"""
    if bridge_controller:
        bridge_controller.stop()
        await asyncio.sleep(1)
        success = bridge_controller.start()
        return JSONResponse({"success": success, "message": "Bridge restarted" if success else "Failed to restart bridge"})
    return JSONResponse({"success": False, "message": "Bridge controller not available"}, status_code=500)

@app.post("/api/bridge/autostart")
async def toggle_autostart(request: Request):
    """Toggle auto-start"""
    data = await request.json()
    enabled = data.get('enabled', False)
    
    if bridge_controller:
        # This will need to be implemented in bridge_controller
        setattr(bridge_controller, 'auto_start_enabled', enabled)
        return JSONResponse({"success": True, "enabled": enabled})
    
    return JSONResponse({"success": False, "message": "Bridge controller not available"}, status_code=500)

@app.post("/api/project/start/{port}")
async def start_project(port: int):
    """Start a project on given port"""
    if project_manager:
        # Find project by port
        for project in project_manager.projects:
            if project.get('dev_port') == port:
                # This would trigger the project start logic
                return JSONResponse({"success": True, "message": f"Starting {project.get('name')}"})
        
        return JSONResponse({"success": False, "message": "Project not found"}, status_code=404)
    
    return JSONResponse({"success": False, "message": "Project manager not available"}, status_code=500)

@app.post("/api/server/open/{port}")
async def open_server(port: int):
    """Open server in browser"""
    import webbrowser
    url = f"http://localhost:{port}"
    webbrowser.open(url)
    return JSONResponse({"success": True, "message": f"Opened {url}"})

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time updates"""
    await websocket.accept()
    
    if service_manager and hasattr(service_manager, 'dashboard'):
        service_manager.dashboard.active_connections.append(websocket)
    
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            
            # Handle ping/pong
            if data == "ping":
                await websocket.send_text("pong")
    
    except WebSocketDisconnect:
        if service_manager and hasattr(service_manager, 'dashboard'):
            service_manager.dashboard.active_connections.remove(websocket)


# === Standalone mode for testing ===

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Create standalone dashboard
    dashboard_mgr = DashboardManager()
    
    # Run the server
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=9999,
        log_level="info"
    )
