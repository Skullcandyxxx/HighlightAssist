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
            else:
                self.send_error(404, "Not Found")
        except Exception as e:
            logger.error(f'Error handling request: {e}')
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
                
                health_data = {
                    'service_manager': 'running',
                    'version': '2.0.0',
                    'timestamp': datetime.now().isoformat(),
                    'bridge': bridge_status,
                    'tcp_server': tcp_status,
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
