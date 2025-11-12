"""Quick test script for new OOP service manager."""
import sys
import time
from pathlib import Path

# Add parent dir to path
sys.path.insert(0, str(Path(__file__).parent))

from core.bridge_controller import BridgeController
from core.tcp_server import TCPControlServer
from core.notifier import NotificationManager

def test_bridge():
    """Test bridge controller."""
    print("\n=== Testing Bridge Controller ===")
    bridge = BridgeController(port=5055)
    
    print(f"Initial status: running={bridge.is_running}")
    
    print("\nStarting bridge...")
    result = bridge.start()
    print(f"Start result: {result}")
    
    time.sleep(1)
    print(f"Status after start: running={bridge.is_running}, pid={bridge.pid}")
    
    print("\nStopping bridge...")
    result = bridge.stop()
    print(f"Stop result: {result}")
    print(f"Status after stop: running={bridge.is_running}")

def test_tcp_server():
    """Test TCP control server."""
    print("\n=== Testing TCP Server ===")
    
    def handler(cmd):
        print(f"Received command: {cmd}")
        return {'status': 'ok', 'echo': cmd}
    
    server = TCPControlServer(port=5054)
    server.set_handler(handler)
    server.start()
    
    print("Server started. Testing with client...")
    
    import socket
    import json
    
    # Send test command
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect(('127.0.0.1', 5054))
    sock.sendall(json.dumps({'action': 'status'}).encode())
    response = sock.recv(8192)
    print(f"Server response: {json.loads(response)}")
    sock.close()
    
    print("Stopping server...")
    server.stop()

def test_notifier():
    """Test notification system."""
    print("\n=== Testing Notifier ===")
    notifier = NotificationManager()
    notifier.notify('Test Title', 'Test message from HighlightAssist')
    print("Notification sent (check your system)")

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--component', choices=['bridge', 'tcp', 'notify', 'all'], default='all')
    args = parser.parse_args()
    
    if args.component in ('bridge', 'all'):
        test_bridge()
    
    if args.component in ('tcp', 'all'):
        test_tcp_server()
    
    if args.component in ('notify', 'all'):
        test_notifier()
    
    print("\n✅ Tests complete!")
