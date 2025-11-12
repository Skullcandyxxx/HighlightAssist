"""HighlightAssist Service Manager v2.0 - Clean OOP Architecture

High-performance daemon for managing the bridge server.
Uses selector-based TCP server for minimal CPU usage.
"""
from __future__ import annotations

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

from core.bridge_controller import BridgeController
from core.notifier import NotificationManager
from core.tcp_server import TCPControlServer

# Setup logging
LOG_DIR = Path.home() / '.highlightassist' / 'logs'
if sys.platform.startswith('win'):
    LOG_DIR = Path(os.environ.get('LOCALAPPDATA', '.')) / 'HighlightAssist' / 'logs'

LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / 'service-manager.log'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        RotatingFileHandler(LOG_FILE, maxBytes=1024*1024, backupCount=3, encoding='utf-8'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


class ServiceManager:
    """Main service manager - coordinates all components."""
    
    def __init__(self, control_port: int = 5054, bridge_port: int = 5055):
        self.bridge = BridgeController(port=bridge_port)
        self.server = TCPControlServer(port=control_port)
        self.notifier = NotificationManager()
        
        # Set command handler
        self.server.set_handler(self._handle_command)
        
        logger.info('HighlightAssist Service Manager v2.0 initialized')
    
    def _handle_command(self, command: dict) -> dict:
        """Handle commands from extension."""
        action = command.get('action', 'unknown')
        
        if action == 'start':
            result = self.bridge.start()
            if result['status'] == 'started':
                self.notifier.notify('HighlightAssist', f'Bridge started on port {self.bridge.port}')
            return result
        
        elif action == 'stop':
            result = self.bridge.stop()
            if result['status'] == 'stopped':
                self.notifier.notify('HighlightAssist', 'Bridge stopped')
            return result
        
        elif action == 'restart':
            result = self.bridge.restart()
            if result['status'] == 'started':
                self.notifier.notify('HighlightAssist', 'Bridge restarted')
            return result
        
        elif action == 'status':
            return {
                'running': self.bridge.is_running,
                'port': self.bridge.port,
                'pid': self.bridge.pid
            }
        
        else:
            return {'error': 'unknown_action', 'action': action}
    
    def run(self):
        """Start service manager (blocks until interrupted)."""
        try:
            self.server.start()
            logger.info('Service manager running. Press Ctrl+C to stop.')
            self.notifier.notify('HighlightAssist', 'Service manager started')
            
            # Block forever
            import signal
            import threading
            event = threading.Event()
            
            def shutdown(signum, frame):
                logger.info('Shutdown signal received')
                event.set()
            
            signal.signal(signal.SIGINT, shutdown)
            signal.signal(signal.SIGTERM, shutdown)
            
            event.wait()
            
        except Exception:
            logger.exception('Fatal error in service manager')
        finally:
            self.shutdown()
    
    def shutdown(self):
        """Clean shutdown."""
        logger.info('Shutting down service manager...')
        self.server.stop()
        self.bridge.stop()
        self.notifier.notify('HighlightAssist', 'Service stopped')
        logger.info('Shutdown complete')


if __name__ == '__main__':
    import os  # Import needed for LOG_DIR calculation
    manager = ServiceManager()
    manager.run()
