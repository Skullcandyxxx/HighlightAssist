"""HighlightAssist Service Manager v2.0 - Clean OOP Architecture

High-performance daemon for managing the bridge server.
Uses selector-based TCP server for minimal CPU usage.
Enhanced with health monitoring and auto-recovery.
"""
from __future__ import annotations

# Prevent __pycache__ creation (must be before other imports)
import sys
sys.dont_write_bytecode = True

import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path

from core.bridge_controller import BridgeController
from core.notifier import NotificationManager
from core.tcp_server import TCPControlServer
from core.health_server import HealthCheckServer
from core.bridge_monitor import BridgeMonitor

# Try to import tray icon
try:
    from tray_icon import HighlightAssistTray
    HAS_TRAY = True
except ImportError:
    HAS_TRAY = False
    print("⚠️  Tray icon disabled (install: pip install pystray pillow)")

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
    
    def __init__(self, control_port: int = 5054, bridge_port: int = 5055, health_port: int = 5056, use_tray: bool = True):
        self.bridge = BridgeController(port=bridge_port)
        self.server = TCPControlServer(port=control_port)
        self.health_server = HealthCheckServer(port=health_port, service_manager=self)
        self.notifier = NotificationManager()
        self.monitor = None  # Bridge monitor (created after initialization)
        self.tray = None
        self.use_tray = use_tray and HAS_TRAY
        self.start_time = datetime.now()
        
        # Set command handler
        self.server.set_handler(self._handle_command)
        
        # Create bridge monitor with callbacks
        self.monitor = BridgeMonitor(
            self.bridge,
            on_crash=self._on_bridge_crash,
            on_recovery=self._on_bridge_recovery
        )
        
        # Create tray icon if available
        if self.use_tray:
            self.tray = HighlightAssistTray(self.bridge, self.notifier)
        
        logger.info('HighlightAssist Service Manager v2.0 initialized')
        logger.info(f'TCP Control: port {control_port}')
        logger.info(f'Bridge: port {bridge_port}')
        logger.info(f'Health Check: port {health_port}')
    
    def _on_bridge_crash(self):
        """Called when bridge crashes"""
        logger.error('🔥 Bridge crashed')
        # Skip notification to avoid win10toast errors
        # self.notifier.notify('HighlightAssist', '⚠️  Bridge crashed - attempting recovery...')
    
    def _on_bridge_recovery(self):
        """Called when bridge recovers"""
        logger.info('✅ Bridge recovered successfully')
        # Skip notification to avoid win10toast errors
        # self.notifier.notify('HighlightAssist', '✅ Bridge recovered successfully')
    
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
        
        elif action == 'shutdown':
            logger.info('Shutdown command received')
            self.notifier.notify('HighlightAssist', 'Shutting down...')
            # Trigger shutdown in background to allow response to be sent
            import threading
            threading.Thread(target=self._delayed_shutdown, daemon=False).start()
            return {'status': 'shutdown_initiated', 'message': 'Service manager shutting down'}
        
        else:
            return {'error': 'unknown_action', 'action': action}
    
    def _delayed_shutdown(self):
        """Delayed shutdown to allow response to be sent."""
        import time
        time.sleep(0.5)  # Give time for response to be sent
        logger.info('Executing delayed shutdown...')
        self.shutdown()
        import sys
        sys.exit(0)
    
    def run(self):
        """Start service manager (blocks until interrupted)."""
        try:
            # Start health check server first
            self.health_server.start()
            
            # Start TCP control server
            self.server.start()
            
            # Start bridge monitor
            self.monitor.start()
            
            logger.info('Service manager running. Press Ctrl+C to stop.')
            # Skip startup notification to avoid win10toast errors
            # self.notifier.notify('HighlightAssist', 'Service manager started')
            
            # Run with tray icon if available
            if self.use_tray and self.tray:
                logger.info('Starting with system tray icon (purple gradient theme)')
                # Tray icon will block until closed
                self.tray.run()
            else:
                # Block until interrupted (console mode)
                logger.info('Running in console mode (no tray icon)')
                import signal
                import threading
                event = threading.Event()
                
                def shutdown(signum, frame):
                    logger.info('Shutdown signal received')
                    event.set()
                
                signal.signal(signal.SIGINT, shutdown)
                signal.signal(signal.SIGTERM, shutdown)
                
                event.wait()
            
        except Exception as e:
            logger.exception(f'Fatal error in service manager: {e}')
        finally:
            self.shutdown()
    
    def shutdown(self):
        """Clean shutdown."""
        logger.info('Shutting down service manager...')
        
        try:
            # Stop monitor first
            if self.monitor:
                self.monitor.stop()
        except Exception as e:
            logger.error(f'Error stopping monitor: {e}')
        
        try:
            # Stop health server
            if self.health_server:
                self.health_server.stop()
        except Exception as e:
            logger.error(f'Error stopping health server: {e}')
        
        try:
            # Stop TCP server
            self.server.stop()
        except Exception as e:
            logger.error(f'Error stopping TCP server: {e}')
        
        try:
            # Stop bridge
            self.bridge.stop()
        except Exception as e:
            logger.error(f'Error stopping bridge: {e}')
        
        self.notifier.notify('HighlightAssist', 'Service stopped')
        logger.info('Shutdown complete')


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='HighlightAssist Service Manager')
    parser.add_argument('--no-tray', action='store_true', help='Run in console mode without tray icon')
    parser.add_argument('--console', action='store_true', help='Show console output (default: hidden when tray enabled)')
    args = parser.parse_args()
    
    # Determine if we should use tray
    use_tray = not args.no_tray
    
    # Hide console window on Windows if running with tray (unless --console specified)
    if use_tray and not args.console and sys.platform.startswith('win'):
        import ctypes
        ctypes.windll.user32.ShowWindow(ctypes.windll.kernel32.GetConsoleWindow(), 0)  # SW_HIDE
    
    manager = ServiceManager(use_tray=use_tray)
    
    # Print startup banner if console visible
    if args.console or not use_tray:
        print("""
╔═══════════════════════════════════════════════════════════╗
║        HighlightAssist Service Manager v2.0               ║
╚═══════════════════════════════════════════════════════════╝

🎨 Mode: """ + ("System Tray" if use_tray else "Console") + """
📍 TCP Control: Port 5054
🌐 WebSocket Bridge: Port 5055 (starts on demand)
""" + ("📍 Look for purple tray icon!" if use_tray else "🖥️  Console mode - Press Ctrl+C to stop") + """

""")
    
    manager.run()
