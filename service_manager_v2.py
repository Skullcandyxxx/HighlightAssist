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
import socket
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path

from core.bridge_controller import BridgeController
from core.notifier import NotificationManager
from core.tcp_server import TCPControlServer
from core.health_server import HealthCheckServer
from core.bridge_monitor import BridgeMonitor
from core.project_manager import ProjectManager
from core.preferences import PreferencesManager

# Optional: Dashboard manager (removed from release, kept for development)
try:
    from web_dashboard import DashboardManager  # type: ignore # Optional
    HAS_DASHBOARD = True
except ImportError:
    HAS_DASHBOARD = False
    DashboardManager = None

# Optional: Tray icon (removed from release, kept for development)
try:
    from tray_icon import HighlightAssistTray  # type: ignore # Optional
    HAS_TRAY = True
except ImportError:
    HAS_TRAY = False
    HighlightAssistTray = None

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


def check_single_instance(port: int = 5054) -> bool:
    """Check if another instance is already running by testing TCP port.
    
    Returns:
        True if this is the only instance, False if another is running
    """
    try:
        # Try to bind to the control port - if it fails, another instance is running
        test_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        test_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        test_socket.bind(('127.0.0.1', port))
        test_socket.close()
        return True  # Port is free, we're the only instance
    except OSError:
        return False  # Port in use, another instance is running



class ServiceManager:
    """Main service manager - coordinates all components."""
    
    def __init__(self, control_port: int = 5054, bridge_port: int = 5055, health_port: int = 5056, use_tray: bool = True, auto_start_bridge: bool = True):
        # Load user preferences first
        self.preferences = PreferencesManager()
        
        # Use preferences for initialization (command-line args override preferences)
        bridge_port = bridge_port if bridge_port != 5055 else self.preferences.get('bridge_port', 5055)
        health_port = health_port if health_port != 5056 else self.preferences.get('dashboard_port', 9999)
        auto_start_bridge = self.preferences.get('auto_start_bridge', auto_start_bridge)
        
        self.bridge = BridgeController(port=bridge_port)
        self.server = TCPControlServer(port=control_port)
        self.health_server = HealthCheckServer(port=health_port, service_manager=self)
        self.notifier = NotificationManager()
        self.project_manager = ProjectManager()
        self.dashboard = DashboardManager(self)  # Web dashboard
        self.monitor = None  # Bridge monitor (created after initialization)
        self.tray = None
        self.use_tray = use_tray and HAS_TRAY
        self.auto_start_bridge = auto_start_bridge
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
            self.tray = HighlightAssistTray(self.bridge, self.notifier, self)
        
        logger.info('HighlightAssist Service Manager v2.0 initialized')
        logger.info(f'TCP Control: port {control_port}')
        logger.info(f'Bridge: port {bridge_port}')
        logger.info(f'Health Check: port {health_port}')
        logger.info(f'Auto-start bridge: {auto_start_bridge}')
    
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
            
            # Start web dashboard in background
            import threading
            import asyncio
            def run_dashboard():
                try:
                    asyncio.run(self.dashboard.start())
                except Exception as e:
                    logger.error(f'Dashboard error: {e}')
            
            dashboard_thread = threading.Thread(target=run_dashboard, daemon=True, name='Dashboard')
            dashboard_thread.start()
            logger.info(f'✅ Web dashboard started on http://127.0.0.1:{self.dashboard.port}')
            self.notifier.notify('HighlightAssist', f'Dashboard: http://127.0.0.1:{self.dashboard.port}')
            
            # Auto-start bridge if enabled
            if self.auto_start_bridge:
                logger.info('Auto-starting bridge...')
                result = self.bridge.start()
                if result['status'] == 'started':
                    logger.info(f"✅ Bridge auto-started on port {result['port']}")
                    self.notifier.notify('HighlightAssist', f'Bridge started on port {result["port"]}')
                else:
                    logger.warning(f"Bridge auto-start result: {result['status']}")
            else:
                logger.info('Bridge auto-start disabled')
            
            logger.info('Service manager running. Press Ctrl+C to stop.')
            
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
        
        # Lock file will be automatically released when process exits
        
        self.notifier.notify('HighlightAssist', 'Service stopped')
        logger.info('Shutdown complete')


if __name__ == '__main__':
    import argparse
    import time
    
    # CRITICAL: Detect if we're pystray's GUI child process
    # pystray.Icon.run() on Windows re-executes this .exe for GUI thread
    # The child should ONLY run the tray GUI, not re-initialize services
    # 
    # DISABLED FOR FROZEN MODE: psutil import fails in PyInstaller bundles
    # causing silent crashes. Tray icon works fine without this check.
    # Original logic kept for reference but commented out.
    '''
    try:
        import psutil
        current_pid = os.getpid()
        parent = psutil.Process(current_pid).parent()
        
        if parent and 'HighlightAssist-Service-Manager' in parent.name():
            # We're the tray GUI child - exit and let pystray handle us
            # pystray will manage this process for its GUI loop
            sys.exit(0)
    except Exception:
        # psutil failed or parent not detectable - assume we're the main process
        pass
    '''
    
    # DEBUG: Log immediately to see how many times this runs
    logger.info(f'========== SERVICE MANAGER STARTING (PID {os.getpid()}) ==========')
    
    # CRITICAL: Single instance check using exclusive file lock
    # This prevents race conditions between rapidly-starting instances
    LOCK_FILE = LOG_DIR / '.service-manager.lock'
    lock_handle = None
    
    try:
        # Open lock file for writing (create if doesn't exist)
        lock_handle = open(LOCK_FILE, 'w')
        
        # Try to acquire exclusive lock
        if sys.platform.startswith('win'):
            import msvcrt
            try:
                # Try to lock the file (non-blocking)
                msvcrt.locking(lock_handle.fileno(), msvcrt.LK_NBLCK, 1)
            except OSError:
                # Lock failed - another instance is running
                print('\n' + '='*60)
                print('⚠️  ANOTHER INSTANCE IS ALREADY RUNNING')
                print('='*60)
                print('\nAnother service manager is already running.')
                print('Check your system tray for the HighlightAssist icon.')
                print('\nIf you need to restart:')
                print('  1. Right-click the tray icon → Exit')
                print('  2. Or run: taskkill /F /IM "HighlightAssist-Service-Manager.exe"')
                print('='*60 + '\n')
                logger.error('Another instance is already running (file lock held)')
                sys.exit(1)
        else:
            # Unix: use fcntl
            import fcntl
            try:
                fcntl.flock(lock_handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            except IOError:
                print('\n⚠️  Another instance is already running!\n')
                logger.error('Another instance is already running (file lock held)')
                sys.exit(1)
        
        # Write our PID to the lock file
        lock_handle.write(str(os.getpid()))
        lock_handle.flush()
        
        # Keep file handle open for the lifetime of the process
        # Lock will be released automatically when process exits
        
    except Exception as e:
        logger.error(f'Error acquiring lock file: {e}')
        sys.exit(1)
    
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
