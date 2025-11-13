"""Bridge process controller - manages uvicorn bridge lifecycle."""
from __future__ import annotations

import logging
import socket
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class BridgeController:
    """Manages the bridge server process lifecycle."""
    
    def __init__(self, port: int = 5055, timeout: float = 10.0):  # Increased from 3.0 to 10.0 seconds
        self.port = port
        self.timeout = timeout
        self._process: Optional[subprocess.Popen] = None
        self._script_dir = Path(__file__).parent.parent
        self._start_time: Optional[datetime] = None
        
    @property
    def is_running(self) -> bool:
        """Check if bridge is responding on its port."""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(0.1)
                return sock.connect_ex(('127.0.0.1', self.port)) == 0
        except Exception:
            return False
    
    @property
    def pid(self) -> Optional[int]:
        """Get bridge process ID if running."""
        return self._process.pid if self._process else None
    
    def start(self) -> dict:
        """Start the bridge server."""
        if self.is_running:
            logger.info('Bridge already running on port %d', self.port)
            return {'status': 'already_running', 'port': self.port, 'pid': self.pid}
        
        try:
            cmd = [
                sys.executable, '-m', 'uvicorn', 'bridge:app',
                '--host', '127.0.0.1',
                '--port', str(self.port),
                '--log-level', 'info'  # Changed from warning to info to see startup messages
            ]
            
            # Setup logging for bridge output
            log_dir = self._script_dir / 'logs'
            log_dir.mkdir(exist_ok=True)
            bridge_log = log_dir / 'bridge.log'
            
            kwargs = {
                'cwd': str(self._script_dir),
                'stdout': open(bridge_log, 'a', encoding='utf-8'),
                'stderr': subprocess.STDOUT  # Merge stderr into stdout
            }
            if sys.platform.startswith('win'):
                # Hide console window on Windows
                kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
            
            self._process = subprocess.Popen(cmd, **kwargs)
            self._start_time = datetime.now()
            logger.info('Bridge process started (PID: %d), logging to %s', self._process.pid, bridge_log)
            
            # Wait for bridge to be ready
            start_time = time.time()
            while time.time() - start_time < self.timeout:
                if self.is_running:
                    logger.info('Bridge ready on port %d', self.port)
                    return {'status': 'started', 'port': self.port, 'pid': self.pid}
                time.sleep(0.1)
            
            # Timeout - kill process
            self._process.terminate()
            self._process = None
            logger.warning('Bridge startup timeout after %.1fs', self.timeout)
            return {'status': 'timeout', 'error': f'Failed to start within {self.timeout}s'}
            
        except Exception as e:
            logger.exception('Failed to start bridge')
            return {'status': 'error', 'error': str(e)}
    
    def get_uptime(self) -> float:
        """Get bridge uptime in seconds."""
        if not self._start_time:
            return 0.0
        return (datetime.now() - self._start_time).total_seconds()
    
    def stop(self) -> dict:
        """Stop the bridge server."""
        if not self._process:
            if not self.is_running:
                return {'status': 'not_running'}
            logger.warning('Bridge running but no process handle - orphaned?')
            return {'status': 'orphaned'}
        
        try:
            self._process.terminate()
            try:
                self._process.wait(timeout=5)
                logger.info('Bridge stopped gracefully')
            except subprocess.TimeoutExpired:
                self._process.kill()
                self._process.wait()
                logger.warning('Bridge killed after timeout')
            
            return {'status': 'stopped'}
        except Exception as e:
            logger.exception('Error stopping bridge')
            return {'status': 'error', 'error': str(e)}
        finally:
            self._process = None
            self._start_time = None
    
    def restart(self) -> dict:
        """Restart the bridge server."""
        stop_result = self.stop()
        if stop_result['status'] not in ('stopped', 'not_running'):
            return stop_result
        time.sleep(0.5)
        return self.start()
    
    def __del__(self):
        """Cleanup on destruction."""
        if self._process:
            try:
                self._process.terminate()
            except Exception:
                pass
