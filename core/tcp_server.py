"""High-performance TCP control server."""
from __future__ import annotations

import json
import logging
import selectors
import socket
import threading
from typing import Callable, Optional

logger = logging.getLogger(__name__)


class TCPControlServer:
    """Non-blocking TCP server for extension commands."""
    
    def __init__(self, port: int = 5054, host: str = '127.0.0.1'):
        self.port = port
        self.host = host
        self._socket: Optional[socket.socket] = None
        self._selector = selectors.DefaultSelector()
        self._thread: Optional[threading.Thread] = None
        self._running = False
        self._handler: Optional[Callable] = None
        
    def set_handler(self, handler: Callable[[dict], dict]):
        """Set the command handler function."""
        self._handler = handler
    
    def start(self):
        """Start the server in background thread."""
        if self._running:
            logger.warning('Server already running')
            return
        
        self._socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._socket.bind((self.host, self.port))
        self._socket.listen(5)
        self._socket.setblocking(False)
        
        self._selector.register(self._socket, selectors.EVENT_READ, data=None)
        self._running = True
        
        self._thread = threading.Thread(target=self._run_loop, daemon=True, name='TCPServer')
        self._thread.start()
        logger.info('TCP server listening on %s:%d', self.host, self.port)
    
    def stop(self):
        """Stop the server gracefully."""
        if not self._running:
            return
        
        self._running = False
        
        if self._thread:
            self._thread.join(timeout=2.0)
        
        self._selector.close()
        
        if self._socket:
            try:
                self._socket.close()
            except Exception:
                pass
            self._socket = None
        
        logger.info('TCP server stopped')
    
    def _run_loop(self):
        """Main event loop using selectors for efficiency."""
        try:
            while self._running:
                events = self._selector.select(timeout=0.5)
                for key, mask in events:
                    if key.data is None:
                        # Accept new connection
                        self._accept(key.fileobj)
                    else:
                        # Handle client request
                        self._service_client(key, mask)
        except Exception:
            logger.exception('Server loop error')
        finally:
            self._selector.close()
    
    def _accept(self, sock: socket.socket):
        """Accept new connection."""
        try:
            conn, addr = sock.accept()
            conn.setblocking(False)
            self._selector.register(conn, selectors.EVENT_READ, data=addr)
            logger.debug('Accepted connection from %s:%d', *addr)
        except Exception:
            logger.exception('Error accepting connection')
    
    def _service_client(self, key: selectors.SelectorKey, mask: int):
        """Handle client request."""
        sock = key.fileobj
        addr = key.data
        
        try:
            data = sock.recv(8192)
            if not data:
                self._close_connection(sock)
                return
            
            # Parse JSON command
            try:
                command = json.loads(data.decode('utf-8', errors='ignore'))
            except json.JSONDecodeError:
                response = {'error': 'invalid_json'}
            else:
                # Call handler
                if self._handler:
                    response = self._handler(command)
                else:
                    response = {'error': 'no_handler'}
            
            # Send response
            sock.sendall(json.dumps(response).encode('utf-8'))
            logger.debug('Processed command from %s:%d: %s', *addr, command.get('action', 'unknown'))
            
        except Exception:
            logger.exception('Error servicing client %s:%d', *addr)
        finally:
            self._close_connection(sock)
    
    def _close_connection(self, sock: socket.socket):
        """Close client connection."""
        try:
            self._selector.unregister(sock)
        except Exception:
            pass
        try:
            sock.close()
        except Exception:
            pass
