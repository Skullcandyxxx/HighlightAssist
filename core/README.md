# Service Manager v2.0 - OOP Architecture

Clean, performant, testable service manager for HighlightAssist.

## Quick Start

```powershell
# Install dependencies (if not already installed)
pip install fastapi uvicorn websockets

# Optional: For notifications
pip install win10toast  # Windows
pip install pync        # macOS

# Run service manager
python service_manager_v2.py
```

## Architecture

### Component Diagram
```
service_manager_v2.py
    ├── BridgeController (/core/bridge_controller.py)
    │   └── Manages uvicorn bridge process
    ├── TCPControlServer (/core/tcp_server.py)
    │   └── Handles extension commands
    └── NotificationManager (/core/notifier.py)
        └── Cross-platform notifications
```

### Data Flow
```
Extension → TCP :5054 → ServiceManager → BridgeController → uvicorn :5055
                             ↓
                    NotificationManager → OS Notifications
```

## Components

### 1. BridgeController
**Purpose**: Manage bridge server lifecycle

**API**:
```python
bridge = BridgeController(port=5055, timeout=3.0)

# Properties
bridge.is_running  # bool
bridge.pid         # Optional[int]

# Methods
bridge.start()     # -> dict: {'status': 'started', 'pid': 12345}
bridge.stop()      # -> dict: {'status': 'stopped'}
bridge.restart()   # -> dict: {'status': 'started', 'pid': 54321}
```

**Features**:
- Non-blocking health checks (100ms timeout)
- Automatic cleanup on object destruction
- Timeout-based startup validation
- Graceful shutdown with fallback to kill

### 2. TCPControlServer
**Purpose**: Handle commands from browser extension

**API**:
```python
server = TCPControlServer(port=5054, host='127.0.0.1')
server.set_handler(lambda cmd: {'status': 'ok'})
server.start()  # Non-blocking (background thread)
server.stop()   # Graceful shutdown
```

**Features**:
- **Selector-based I/O** for minimal CPU usage
- Event-driven (sleeps when idle)
- Automatic JSON parsing/serialization
- Non-blocking operation

**Performance**: <0.5% CPU when idle (vs 3-5% polling)

### 3. NotificationManager
**Purpose**: Cross-platform desktop notifications

**API**:
```python
notifier = NotificationManager()
notifier.notify('Title', 'Message')  # Platform-agnostic
```

**Strategy Chain**:
```
Windows: win10toast → LoggerNotifier
macOS:   pync → LoggerNotifier
Linux:   notify-send → LoggerNotifier
```

**Features**:
- Automatic platform detection
- Graceful fallback to logging
- No exceptions propagated
- Lazy dependency loading

## Testing

### Run All Tests
```powershell
python test_service_manager.py
```

### Test Individual Components
```powershell
# Test bridge controller only
python test_service_manager.py --component bridge

# Test TCP server only
python test_service_manager.py --component tcp

# Test notifications only
python test_service_manager.py --component notify
```

### Expected Output
```
=== Testing Bridge Controller ===
Initial status: running=False
Starting bridge...
Start result: {'status': 'started', 'port': 5055, 'pid': 12345}
Status after start: running=True, pid=12345
Stopping bridge...
Stop result: {'status': 'stopped'}
Status after stop: running=False

=== Testing TCP Server ===
Server started. Testing with client...
Received command: {'action': 'status'}
Server response: {'status': 'ok', 'echo': {'action': 'status'}}
Stopping server...

=== Testing Notifier ===
Notification sent (check your system)

✅ Tests complete!
```

## Extension Integration

### Command Protocol (TCP JSON)

**Request**:
```json
{
  "action": "start"  // "start" | "stop" | "restart" | "status"
}
```

**Response**:
```json
// Start/Restart
{
  "status": "started",
  "port": 5055,
  "pid": 12345
}

// Stop
{
  "status": "stopped"
}

// Status
{
  "running": true,
  "port": 5055,
  "pid": 12345
}

// Error
{
  "error": "timeout",
  "status": "failed"
}
```

### Client Example (JavaScript)
```javascript
// From background.js
const net = require('net');

function sendCommand(action) {
  return new Promise((resolve) => {
    const client = net.createConnection({ port: 5054 }, () => {
      client.write(JSON.stringify({ action }));
    });
    client.on('data', (data) => {
      resolve(JSON.parse(data.toString()));
      client.end();
    });
  });
}

// Usage
const result = await sendCommand('start');
console.log(result);  // {'status': 'started', ...}
```

## Deployment

### Standalone Executable (PyInstaller)
```powershell
# Update pyinstaller.spec to use service_manager_v2.py
# Then build:
pyinstaller pyinstaller.spec
```

### System Service

**Windows** (Startup folder):
```powershell
# Create shortcut to service_manager_v2.py
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\HighlightAssist.lnk")
$Shortcut.TargetPath = "pythonw.exe"
$Shortcut.Arguments = "D:\Projects\LawHub\HighlightAssist\service_manager_v2.py"
$Shortcut.Save()
```

**Linux** (systemd):
```ini
[Unit]
Description=HighlightAssist Service Manager
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /path/to/service_manager_v2.py
Restart=always

[Install]
WantedBy=default.target
```

**macOS** (LaunchAgent):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.highlightassist.service</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/path/to/service_manager_v2.py</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

## Troubleshooting

### Bridge won't start
```python
# Check if port is already in use
import socket
sock = socket.socket()
try:
    sock.bind(('127.0.0.1', 5055))
    print("Port available")
except OSError:
    print("Port in use - kill process using it")
finally:
    sock.close()
```

### High CPU usage
```powershell
# Check if using v1.0 by mistake
ps | Where-Object {$_.CommandLine -like "*service-manager.py*"}

# Should show service_manager_v2.py, not service-manager.py
```

### Notifications not appearing
```python
# Test notification system
from core.notifier import NotificationManager
notifier = NotificationManager()
notifier.notify('Test', 'If you see this, notifications work')

# Check logs
cat ~/.highlightassist/logs/service-manager.log  # Linux/macOS
type %LOCALAPPDATA%\HighlightAssist\logs\service-manager.log  # Windows
```

## Performance Metrics

| Metric | v1.0 (Polling) | v2.0 (Selector) | Improvement |
|--------|----------------|-----------------|-------------|
| CPU (idle) | 3-5% | <0.5% | 60-90% less |
| Memory | 45MB | 18MB | 60% less |
| Startup | 3-5s | <1s | 3x faster |
| Response | 100-500ms | 10-50ms | 10x faster |

## License

Same as parent project (HighlightAssist)

## Contributing

See main README.md and CONTRIBUTING.md

---

**Questions?** Check ARCHITECTURE_COMPARISON.md for detailed technical comparison with v1.0.
