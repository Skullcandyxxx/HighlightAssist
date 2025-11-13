"""
HighlightAssist Bridge Monitor
Watches bridge health and auto-recovers from crashes
"""
import logging
import threading
import time
from datetime import datetime

logger = logging.getLogger(__name__)


class BridgeMonitor:
    """
    Monitors bridge process health and auto-restarts on failure.
    
    Features:
    - Periodic health checks (every 10 seconds)
    - Auto-restart on crash detection
    - Restart throttling (max 5 restarts per hour)
    - Event callbacks for monitoring
    """
    
    def __init__(self, bridge_controller, on_crash=None, on_recovery=None):
        self.bridge = bridge_controller
        self.on_crash = on_crash  # Callback when crash detected
        self.on_recovery = on_recovery  # Callback when recovered
        
        self._running = False
        self._thread = None
        self._check_interval = 10  # seconds
        
        # Restart throttling
        self._restart_history = []  # List of restart timestamps
        self._max_restarts_per_hour = 5
        
        # Statistics
        self.total_crashes = 0
        self.total_recoveries = 0
        self.last_check_time = None
        
        logger.info('Bridge monitor initialized')
    
    def start(self):
        """Start monitoring bridge"""
        if self._running:
            logger.warning('Bridge monitor already running')
            return
        
        self._running = True
        self._thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._thread.start()
        
        logger.info('✅ Bridge monitor started')
    
    def stop(self):
        """Stop monitoring"""
        if not self._running:
            return
        
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)
        
        logger.info('Bridge monitor stopped')
    
    def _monitor_loop(self):
        """Main monitoring loop"""
        logger.info('Bridge monitor loop started')
        
        while self._running:
            try:
                self._check_bridge_health()
                time.sleep(self._check_interval)
            except Exception as e:
                logger.error(f'Error in bridge monitor loop: {e}', exc_info=True)
                time.sleep(self._check_interval)
        
        logger.info('Bridge monitor loop stopped')
    
    def _check_bridge_health(self):
        """Check if bridge is healthy"""
        self.last_check_time = datetime.now()
        
        # Check if bridge should be running but isn't
        if self.bridge.is_running:
            # Bridge thinks it's running - verify process is actually alive
            if not self._verify_process_alive():
                logger.warning('⚠️  Bridge process crashed - initiating recovery')
                self.total_crashes += 1
                
                # Call crash callback
                if self.on_crash:
                    try:
                        self.on_crash()
                    except Exception as e:
                        logger.error(f'Error in crash callback: {e}')
                
                # Attempt recovery
                self._attempt_recovery()
    
    def _verify_process_alive(self):
        """Verify bridge process is actually running"""
        try:
            if not self.bridge.pid:
                return False
            
            import psutil
            
            # Check if process exists
            if not psutil.pid_exists(self.bridge.pid):
                logger.warning(f'Bridge PID {self.bridge.pid} no longer exists')
                return False
            
            # Check if it's actually our process (not just same PID reused)
            try:
                proc = psutil.Process(self.bridge.pid)
                # Check if process name contains 'python' or 'uvicorn'
                name = proc.name().lower()
                if 'python' not in name and 'uvicorn' not in name:
                    logger.warning(f'Bridge PID {self.bridge.pid} is not python/uvicorn: {name}')
                    return False
            except psutil.NoSuchProcess:
                return False
            
            return True
            
        except ImportError:
            # psutil not available - fall back to simple check
            logger.debug('psutil not available - using basic process check')
            return self.bridge.is_running
        except Exception as e:
            logger.error(f'Error verifying process: {e}')
            return True  # Assume alive on error to avoid false positives
    
    def _attempt_recovery(self):
        """Attempt to restart bridge"""
        
        # Check restart throttling
        if not self._should_restart():
            logger.error('❌ Restart throttled - too many restarts recently')
            return
        
        try:
            logger.info('🔄 Attempting to restart bridge...')
            
            # Clean up zombie state
            self.bridge.is_running = False
            self.bridge.pid = None
            
            # Restart bridge
            result = self.bridge.start()
            
            if result.get('status') == 'started':
                logger.info('✅ Bridge successfully recovered')
                self.total_recoveries += 1
                
                # Call recovery callback
                if self.on_recovery:
                    try:
                        self.on_recovery()
                    except Exception as e:
                        logger.error(f'Error in recovery callback: {e}')
            else:
                logger.error(f'❌ Bridge recovery failed: {result}')
                
        except Exception as e:
            logger.error(f'Error during recovery: {e}', exc_info=True)
    
    def _should_restart(self):
        """Check if restart is allowed (throttling)"""
        now = datetime.now()
        
        # Clean old restart history (older than 1 hour)
        self._restart_history = [
            ts for ts in self._restart_history
            if (now - ts).total_seconds() < 3600
        ]
        
        # Check if we've exceeded max restarts
        if len(self._restart_history) >= self._max_restarts_per_hour:
            logger.warning(
                f'Restart throttled: {len(self._restart_history)} restarts in last hour '
                f'(max: {self._max_restarts_per_hour})'
            )
            return False
        
        # Record this restart attempt
        self._restart_history.append(now)
        return True
    
    def get_stats(self):
        """Get monitoring statistics"""
        return {
            'total_crashes': self.total_crashes,
            'total_recoveries': self.total_recoveries,
            'last_check': self.last_check_time.isoformat() if self.last_check_time else None,
            'restarts_last_hour': len(self._restart_history),
            'monitoring': self._running
        }
