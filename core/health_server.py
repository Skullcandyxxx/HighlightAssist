"""
HighlightAssist Health Check Server
Separate from bridge for reliable status monitoring
Runs on port 5056 - lightweight HTTP server
"""
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import threading
from datetime import datetime

logger = logging.getLogger(__name__)


class HealthCheckHandler(BaseHTTPRequestHandler):
    """Simple HTTP handler for health checks"""
    
    # Class-level reference to service manager
    service_manager = None
    
    def log_message(self, format, *args):
        """Suppress request logging (too verbose)"""
        pass
    
    def do_GET(self):
        """Handle GET requests"""
        try:
            if self.path == '/health':
                self.send_health_response()
            elif self.path == '/ping':
                self.send_ping_response()
            elif self.path == '/projects':
                self.send_projects_response()
            elif self.path == '/projects/scan':
                self.send_projects_scan_response()
            else:
                self.send_error(404, "Not Found")
        except Exception as e:
            logger.error(f'Error handling request: {e}')
            self.send_error(500, str(e))
    
    def do_POST(self):
        """Handle POST requests for commands"""
        try:
            if self.path == '/command':
                self.handle_command()
            elif self.path == '/scan-servers':
                self.handle_scan_servers()
            else:
                self.send_error(404, "Not Found")
        except Exception as e:
            logger.error(f'Error handling POST request: {e}')
            self.send_error(500, str(e))
    
    def handle_command(self):
        """Handle bridge control commands via HTTP"""
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode())
            
            action = data.get('action')
            if not action:
                self.send_error(400, "Missing 'action' field")
                return
            
            manager = self.service_manager
            if not manager:
                self.send_error(503, "Service manager not available")
                return
            
            # Handle commands
            if action == 'start':
                result = manager.bridge.start()
            elif action == 'stop':
                result = manager.bridge.stop()
            elif action == 'restart':
                result = manager.bridge.restart()
            elif action == 'status':
                result = {
                    'running': manager.bridge.is_running,
                    'port': manager.bridge.port,
                    'pid': manager.bridge.pid
                }
            else:
                self.send_error(400, f"Unknown action: {action}")
                return
            
            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
        except Exception as e:
            logger.error(f'Error handling command: {e}', exc_info=True)
            self.send_error(500, str(e))
    
    def send_health_response(self):
        """Send comprehensive health status"""
        try:
            manager = self.service_manager
            
            if not manager:
                # Fallback if manager not available
                health_data = {
                    'service_manager': 'initializing',
                    'version': '2.0.0',
                    'timestamp': datetime.now().isoformat()
                }
            else:
                # Check bridge status
                bridge_status = {
                    'status': 'running' if manager.bridge.is_running else 'stopped',
                    'port': manager.bridge.port,
                    'pid': manager.bridge.pid,
                    'uptime_seconds': manager.bridge.get_uptime() if hasattr(manager.bridge, 'get_uptime') else 0
                }
                
                # Check TCP server status
                tcp_status = {
                    'status': 'running' if manager.server._running else 'stopped',
                    'port': manager.server.port
                }
                
                # Check dashboard status
                dashboard_status = None
                if hasattr(manager, 'dashboard') and manager.dashboard:
                    dashboard_url = manager.dashboard.get_dashboard_url()
                    dashboard_status = {
                        'url': dashboard_url,
                        'port': manager.dashboard.port if hasattr(manager.dashboard, 'port') else 9999,
                        'status': 'running' if dashboard_url else 'stopped'
                    }
                
                # Get server list from project manager
                servers = []
                if hasattr(manager, 'project_manager') and manager.project_manager:
                    try:
                        # Get detected servers (fast - from cache)
                        detected = manager.project_manager.get_detected_servers()
                        servers = detected if detected else []
                    except Exception as e:
                        logger.debug(f'Could not get servers: {e}')
                
                health_data = {
                    'service_manager': 'running',
                    'version': '2.0.0',
                    'timestamp': datetime.now().isoformat(),
                    'bridge': bridge_status,
                    'tcp_server': tcp_status,
                    'dashboard': dashboard_status,
                    'servers': servers,  # Extension can display these
                    'uptime_seconds': (datetime.now() - manager.start_time).total_seconds() if hasattr(manager, 'start_time') else 0
                }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(health_data).encode())
            
        except Exception as e:
            logger.error(f'Error generating health response: {e}', exc_info=True)
            try:
                self.send_error(500, str(e))
            except:
                pass  # Already sent headers
    
    def send_ping_response(self):
        """Fast ping response for quick checks"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({
            'status': 'ok',
            'timestamp': datetime.now().isoformat()
        }).encode())
    
    def send_projects_response(self):
        """Return list of detected/suggested projects"""
        try:
            manager = self.service_manager
            if not manager or not hasattr(manager, 'project_manager'):
                projects = []
            else:
                # Get recent projects (fast - from cache)
                suggestions = manager.project_manager.get_suggestions(include_scan=False)
                projects = suggestions['recent']
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'projects': projects,
                'total': len(projects),
                'timestamp': datetime.now().isoformat()
            }).encode())
            
        except Exception as e:
            logger.error(f'Error generating projects response: {e}', exc_info=True)
            self.send_error(500, str(e))
    
    def send_projects_scan_response(self):
        """Scan common directories and return detected projects (slower)"""
        try:
            manager = self.service_manager
            if not manager or not hasattr(manager, 'project_manager'):
                projects = []
            else:
                # Full scan (slow - can take seconds)
                logger.info('Scanning common directories for projects...')
                suggestions = manager.project_manager.get_suggestions(include_scan=True)
                projects = suggestions['detected']
                logger.info(f'Found {len(projects)} projects')
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'projects': projects,
                'total': len(projects),
                'timestamp': datetime.now().isoformat()
            }).encode())
            
        except Exception as e:
            logger.error(f'Error scanning for projects: {e}', exc_info=True)
            self.send_error(500, str(e))
    
    def handle_scan_servers(self):
        """Trigger server rescan and return fresh list"""
        try:
            manager = self.service_manager
            if not manager or not hasattr(manager, 'project_manager'):
                servers = []
            else:
                # Force rescan of running servers
                logger.info('Rescanning running servers on localhost...')
                manager.project_manager.scan_running_servers()  # Refresh cache
                servers = manager.project_manager.get_detected_servers()
                logger.info(f'Found {len(servers)} running servers')
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'servers': servers,
                'total': len(servers),
                'timestamp': datetime.now().isoformat()
            }).encode())
            
        except Exception as e:
            logger.error(f'Error scanning servers: {e}', exc_info=True)
            self.send_error(500, str(e))


class HealthCheckServer:
    """Lightweight HTTP server for health checks"""
    
    def __init__(self, port=5056, service_manager=None):
        self.port = port
        self.server = None
        self.thread = None
        self._running = False
        
        # Pass service manager reference to handler
        HealthCheckHandler.service_manager = service_manager
        
        logger.info(f'Health check server initialized on port {port}')
    
    def start(self):
        """Start health check server in background thread"""
        if self._running:
            logger.warning('Health check server already running')
            return
        
        try:
            logger.info(f'Creating HTTPServer on 127.0.0.1:{self.port}...')
            self.server = HTTPServer(('127.0.0.1', self.port), HealthCheckHandler)
            self._running = True
            
            logger.info(f'HTTPServer created successfully, starting thread...')
            # Run in daemon thread
            self.thread = threading.Thread(target=self._run_server, daemon=True, name='HealthCheckServer')
            self.thread.start()
            
            logger.info(f'✅ Health check server started on http://localhost:{self.port}')
            
        except OSError as e:
            if e.errno == 10048:  # Address already in use
                logger.error(f'Port {self.port} already in use')
            else:
                logger.error(f'OS error starting health check server: {e}', exc_info=True)
            self._running = False
        except Exception as e:
            logger.error(f'Failed to start health check server: {e}', exc_info=True)
            self._running = False
    
    def _run_server(self):
        """Run server loop"""
        try:
            logger.info(f'Health check server loop starting on thread {threading.current_thread().name}...')
            logger.info(f'Server address: {self.server.server_address}')
            self.server.serve_forever()
        except Exception as e:
            logger.error(f'Health check server error: {e}', exc_info=True)
        finally:
            self._running = False
            logger.info('Health check server loop stopped')
    
    def stop(self):
        """Stop health check server"""
        if not self._running:
            return
        
        try:
            self._running = False
            if self.server:
                self.server.shutdown()
                self.server.server_close()
            
            if self.thread and self.thread.is_alive():
                self.thread.join(timeout=2)
            
            logger.info('Health check server stopped')
            
        except Exception as e:
            logger.error(f'Error stopping health check server: {e}')
    
    @property
    def is_running(self):
        """Check if server is running"""
        return self._running
