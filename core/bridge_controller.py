"""Bridge process controller - manages uvicorn bridge lifecycle."""
from __future__ import annotations

import logging
import os
import socket
import subprocess
import sys
import time
import threading
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
        self._thread: Optional[threading.Thread] = None
        self._script_dir = Path(__file__).parent.parent
        self._start_time: Optional[datetime] = None
        self._server = None  # For in-process uvicorn server
        
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
            # IMPORTANT: PyInstaller bundles cannot use subprocess mode due to Python DLL conflicts
            # When bundled Python 3.13 tries to run system Python 3.10 with -m uvicorn,
            # we get: "Module use of python313.dll conflicts with this version of Python"
            # Therefore, we MUST use in-process thread mode when frozen.
            
            if getattr(sys, 'frozen', False):
                # Running as compiled executable - use in-process thread mode
                logger.info('Running bridge in-process (PyInstaller bundle - subprocess not possible)')
                return self._start_in_process()
            else:
                # Running as script - use subprocess mode (faster, no GIL contention)
                bridge_path = self._script_dir / 'bridge.py'
                
                if not bridge_path.exists():
                    logger.error('Bridge script not found at %s', bridge_path)
                    return {'status': 'error', 'error': f'bridge.py not found at {bridge_path}'}
                
                cmd = [
                    sys.executable, '-m', 'uvicorn', 'bridge:app',
                    '--host', '127.0.0.1',
                    '--port', str(self.port),
                    '--log-level', 'info'
                ]
                
                log_dir = self._script_dir / 'logs'
                log_dir.mkdir(parents=True, exist_ok=True)
                bridge_log = log_dir / 'bridge.log'
                
                kwargs = {
                    'cwd': str(bridge_path.parent),
                    'stdout': open(bridge_log, 'a', encoding='utf-8'),
                    'stderr': subprocess.STDOUT
                }
                if sys.platform.startswith('win'):
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
        # Handle in-process (thread) mode
        if self._server:
            try:
                self._server.should_exit = True
                if self._thread and self._thread.is_alive():
                    self._thread.join(timeout=5)
                logger.info('Bridge stopped (in-process mode)')
                return {'status': 'stopped'}
            except Exception as e:
                logger.exception('Error stopping in-process bridge')
                return {'status': 'error', 'error': str(e)}
            finally:
                self._server = None
                self._thread = None
                self._start_time = None
        
        # Handle subprocess mode
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
    
    def _start_in_process(self) -> dict:
        """Start bridge in-process as a thread (for PyInstaller bundle).
        
        NOTE: This mode has slower HTTP response times (~2 seconds) due to Python GIL contention
        with other threads (health server, TCP server, etc.). However, it's the only viable option
        for PyInstaller bundles because subprocess mode creates Python DLL version conflicts.
        """
        try:
            import uvicorn
            
            # Add bundle directory to path so bridge module can be imported
            if hasattr(sys, '_MEIPASS'):
                sys.path.insert(0, sys._MEIPASS)
            
            # Import bridge app
            from bridge import app
            
            # Create uvicorn config WITHOUT logging (we'll use our own logger)
            config = uvicorn.Config(
                app,
                host='127.0.0.1',
                port=self.port,
                log_config=None,  # Disable uvicorn's logging config (causes issues in bundle)
                access_log=False
            )
            
            # Create server
            self._server = uvicorn.Server(config)
            
            # Run server in thread
            def run_server():
                try:
                    import asyncio
                    asyncio.run(self._server.serve())
                except Exception as e:
                    logger.exception('Bridge thread error: %s', e)
            
            self._thread = threading.Thread(target=run_server, daemon=True, name='BridgeServer')
            self._thread.start()
            self._start_time = datetime.now()
            
            logger.info('Bridge thread started, waiting for server to be ready...')
            logger.info('⚠️  NOTE: HTTP responses may be slow (~2s) due to GIL contention in thread mode')
            
            # Wait for server to be ready
            start_time = time.time()
            while time.time() - start_time < self.timeout:
                if self.is_running:
                    logger.info('Bridge ready on port %d (in-process mode)', self.port)
                    return {'status': 'started', 'port': self.port, 'mode': 'in-process'}
                time.sleep(0.1)
            
            logger.warning('Bridge startup timeout after %.1fs', self.timeout)
            return {'status': 'timeout', 'error': f'Failed to start within {self.timeout}s'}
            
        except Exception as e:
            logger.exception('Error starting bridge in-process')
            return {'status': 'error', 'error': str(e)}

    
    def __del__(self):
        """Cleanup on destruction."""
        if self._process:
            try:
                self._process.terminate()
            except Exception:
                pass
        if self._server:
            try:
                self._server.should_exit = True
            except Exception:
                pass
