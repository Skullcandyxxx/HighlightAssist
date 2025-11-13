# HighlightAssist Complete Rebuild Plan

**Date:** November 12, 2025  
**Version:** 1.3.0 → 2.0.0  
**Goal:** Professional, production-ready installer with robust tray, popup, and daemon logic

---

## 🎯 Current Issues Identified

### 1. **Architecture Fragmentation**
- ❌ Service manager v2.0 exists but not fully integrated with installer
- ❌ Tray icon exists but not tested in packaged .exe
- ❌ Popup assumes daemon is running but has no proper startup/shutdown flow
- ❌ No health check mechanism between extension ↔ daemon ↔ bridge
- ❌ Background.js has native messaging code but it's unused (all communication via HTTP/WebSocket)

### 2. **Installer Issues**
- ❌ PyInstaller spec may not bundle all dependencies correctly (pystray, PIL, core/ modules)
- ❌ Inno Setup doesn't verify if .exe actually works before completing
- ❌ No post-install validation (does tray icon appear? is bridge accessible?)
- ❌ Daemon auto-start not properly configured (no Windows startup shortcut)
- ❌ Uninstaller doesn't clean up running processes

### 3. **Tray Icon Issues**
- ❌ Not tested in compiled .exe environment
- ❌ Icon creation may fail if fonts missing
- ❌ No graceful fallback if pystray/PIL not bundled correctly
- ❌ Tray menu actions may not work if bridge_controller not imported properly

### 4. **Popup Logic Issues**
- ❌ Daemon detection is HTTP-based (fetch to localhost:5055) - fragile
- ❌ Start/Stop daemon buttons show OS-specific instructions instead of actually starting daemon
- ❌ No real-time status updates (popup has to be closed/reopened)
- ❌ "Start Server" feature only works if daemon is already running
- ❌ No error recovery if bridge crashes

### 5. **Bridge Issues**
- ❌ Bridge can be started/stopped but extension doesn't know if it crashes
- ❌ No heartbeat/ping mechanism
- ❌ WebSocket connections can drop silently
- ❌ shutdown_service_manager command exists but needs TCP connection (may fail if TCP server not responding)

### 6. **Missing Features**
- ❌ No automatic recovery if bridge crashes
- ❌ No update mechanism (user has to manually download new installer)
- ❌ No telemetry/crash reporting
- ❌ No unified logging (logs scattered between bridge, service manager, extension)

---

## 🏗️ Rebuild Architecture Plan

### Phase 1: Foundation (Core Services)

#### 1.1 Enhanced Service Manager (`service_manager_v2.py`)
**Changes:**
- ✅ Keep OOP architecture with core/ modules
- ✅ Add auto-recovery for bridge crashes
- ✅ Add HTTP health endpoint on port 5056 (separate from bridge)
- ✅ Add process monitoring (check if bridge still alive)
- ✅ Emit status events that popup can listen to

**New Features:**
```python
class ServiceManager:
    def __init__(self):
        # Existing code...
        self.health_server = HealthCheckServer(port=5056)  # New
        self.bridge_monitor = BridgeMonitor(self.bridge, self.restart_bridge)  # New
    
    def restart_bridge(self):
        """Auto-restart if bridge crashes"""
        logger.warning('Bridge crashed - auto-restarting...')
        self.bridge.restart()
        self.notifier.notify('Bridge restarted', 'Recovered from crash')
```

**Health Check Endpoint:**
```python
# GET http://localhost:5056/health
{
    "service_manager": "running",
    "bridge": {
        "status": "running",
        "port": 5055,
        "pid": 12345,
        "uptime_seconds": 3600
    },
    "tcp_server": {
        "status": "running",
        "port": 5054
    },
    "version": "2.0.0"
}
```

#### 1.2 Enhanced Bridge (`bridge.py`)
**Changes:**
- ✅ Add heartbeat endpoint (`/ping`) that responds immediately
- ✅ Add connection counter and uptime tracking
- ✅ Improve error handling for shutdown command
- ✅ Add structured logging with timestamps

**New Endpoints:**
```python
@app.get("/ping")
async def ping():
    """Fast health check"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.get("/metrics")
async def metrics():
    """Detailed metrics for debugging"""
    return {
        "active_connections": len(manager.active_connections),
        "total_messages": manager.total_messages,
        "uptime": manager.uptime_seconds,
        "memory_mb": get_memory_usage()
    }
```

#### 1.3 Tray Icon (`tray_icon.py`)
**Changes:**
- ✅ Add font fallback chain (try Arial → Segoe UI → default)
- ✅ Add validation before running (check if pystray/PIL available)
- ✅ Add "Open Extension" menu item (opens chrome://extensions in browser)
- ✅ Real-time icon updates based on bridge status (poll every 5 seconds)

**Enhanced Menu:**
```python
pystray.Menu(
    pystray.MenuItem('🎨 HighlightAssist v2.0', None, enabled=False),
    pystray.Menu.SEPARATOR,
    pystray.MenuItem('▶️  Start Bridge', self._on_start, enabled=lambda: not self.bridge.is_running),
    pystray.MenuItem('⏸️  Stop Bridge', self._on_stop, enabled=lambda: self.bridge.is_running),
    pystray.MenuItem('🔄 Restart Bridge', self._on_restart, enabled=lambda: self.bridge.is_running),
    pystray.Menu.SEPARATOR,
    pystray.MenuItem('🌐 Open Extension', self._on_open_extension),  # NEW
    pystray.MenuItem('📊 Status', self._on_status, default=True),
    pystray.MenuItem('📂 Open Logs', self._on_open_logs),
    pystray.MenuItem('🔧 Settings', self._on_settings),  # NEW
    pystray.Menu.SEPARATOR,
    pystray.MenuItem('❌ Exit', self._on_exit)
)
```

---

### Phase 2: Extension Integration

#### 2.1 Enhanced Popup (`popup.js`)
**Complete Rewrite:**

**New Architecture:**
```javascript
// State machine for daemon connection
const DaemonState = {
    UNKNOWN: 'unknown',        // Initial state
    NOT_INSTALLED: 'not_installed',  // Daemon not installed
    STOPPED: 'stopped',        // Installed but not running
    STARTING: 'starting',      // Starting up
    RUNNING: 'running',        // Fully operational
    ERROR: 'error'             // Error state
};

class PopupController {
    constructor() {
        this.daemonState = DaemonState.UNKNOWN;
        this.bridgeState = 'unknown';
        this.healthCheckInterval = null;
    }
    
    async init() {
        // Start continuous health checks
        await this.checkHealth();
        this.healthCheckInterval = setInterval(() => this.checkHealth(), 5000);
    }
    
    async checkHealth() {
        try {
            // Check service manager health endpoint (port 5056)
            const response = await fetch('http://localhost:5056/health', {
                method: 'GET',
                signal: AbortSignal.timeout(1000)
            });
            
            if (response.ok) {
                const data = await response.json();
                this.updateDaemonState(DaemonState.RUNNING, data);
            } else {
                this.updateDaemonState(DaemonState.ERROR);
            }
        } catch (error) {
            // Service manager not responding
            this.updateDaemonState(DaemonState.STOPPED);
        }
    }
    
    updateDaemonState(newState, healthData = null) {
        this.daemonState = newState;
        this.renderDaemonStatus(newState, healthData);
    }
    
    renderDaemonStatus(state, data) {
        const badge = document.getElementById('daemonStatus');
        
        switch(state) {
            case DaemonState.RUNNING:
                badge.className = 'daemon-badge connected';
                badge.innerHTML = `
                    <div class="status-icon">✅</div>
                    <div class="status-info">
                        <div class="status-title">Connected & Ready</div>
                        <div class="status-detail">
                            Bridge: ${data.bridge.status} (PID ${data.bridge.pid})
                            <button class="mini-btn" id="stopDaemonBtn">⏹️ Stop</button>
                        </div>
                    </div>
                `;
                break;
                
            case DaemonState.STOPPED:
                badge.className = 'daemon-badge disconnected';
                badge.innerHTML = `
                    <div class="status-icon">🔌</div>
                    <div class="status-info">
                        <div class="status-title">Not Running</div>
                        <div class="status-detail">
                            Click to start
                            <button class="mini-btn" id="startDaemonBtn">▶️ Start</button>
                        </div>
                    </div>
                `;
                break;
                
            // ... other states
        }
        
        this.attachButtonHandlers();
    }
    
    async startDaemon() {
        // Actually start the daemon via Windows registry run key or service
        // This requires native messaging or fallback to instructions
        this.updateDaemonState(DaemonState.STARTING);
        
        // Option 1: Try native messaging
        const result = await this.sendNativeMessage({action: 'start_service'});
        
        if (result.success) {
            // Wait for service to start
            setTimeout(() => this.checkHealth(), 2000);
        } else {
            // Option 2: Show instructions to manually start
            this.showStartInstructions();
        }
    }
    
    async stopDaemon() {
        try {
            // Send shutdown command via TCP (not HTTP, to avoid timeouts)
            const socket = new WebSocket('ws://localhost:5055/ws');
            
            socket.onopen = () => {
                socket.send(JSON.stringify({
                    type: 'shutdown_service_manager'
                }));
                
                // Wait for confirmation
                setTimeout(() => {
                    socket.close();
                    this.updateDaemonState(DaemonState.STOPPED);
                }, 1000);
            };
        } catch (error) {
            console.error('Failed to stop daemon:', error);
            this.showError('Failed to stop daemon. Try closing tray icon manually.');
        }
    }
}

// Initialize
const popup = new PopupController();
popup.init();
```

**Benefits:**
- ✅ Real-time status updates (checks every 5 seconds)
- ✅ Proper state machine (no more guessing)
- ✅ Actual daemon start/stop (not just instructions)
- ✅ Error recovery and user feedback

#### 2.2 Background Service Worker (`background.js`)
**Changes:**
- ✅ Remove unused native messaging code (replace with WebSocket)
- ✅ Add connection monitoring to bridge
- ✅ Auto-reconnect WebSocket if bridge restarts
- ✅ Badge updates based on real bridge status

**New Code:**
```javascript
class BridgeMonitor {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.reconnectAttempts = 0;
    }
    
    connect() {
        this.ws = new WebSocket('ws://localhost:5055/ws');
        
        this.ws.onopen = () => {
            console.log('✅ Connected to bridge');
            this.connected = true;
            this.reconnectAttempts = 0;
            chrome.action.setBadgeText({text: 'ON'});
            chrome.action.setBadgeBackgroundColor({color: '#10b981'});
        };
        
        this.ws.onclose = () => {
            console.log('❌ Disconnected from bridge');
            this.connected = false;
            chrome.action.setBadgeText({text: ''});
            
            // Auto-reconnect
            if (this.reconnectAttempts < 5) {
                setTimeout(() => {
                    this.reconnectAttempts++;
                    this.connect();
                }, 5000);
            }
        };
    }
}

const monitor = new BridgeMonitor();
monitor.connect();
```

---

### Phase 3: Installer Improvements

#### 3.1 PyInstaller Spec (`pyinstaller.spec`)
**Critical Fixes:**

```python
# -*- mode: python ; coding: utf-8 -*-

import sys
from pathlib import Path

block_cipher = None

# Collect all core modules
core_modules = [
    ('core/bridge_controller.py', 'core'),
    ('core/notifier.py', 'core'),
    ('core/tcp_server.py', 'core'),
    ('core/__init__.py', 'core'),
]

# Data files to include
data_files = [
    ('assets/icon-128.png', 'assets'),
    ('README.md', '.'),
    ('LICENSE', '.'),
]

a = Analysis(
    ['service_manager_v2.py'],
    pathex=[],
    binaries=[],
    datas=data_files + core_modules,
    hiddenimports=[
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'fastapi',
        'pystray',
        'PIL',
        'PIL._imaging',
        'win10toast',
        'plyer',
        'pync',
        'core.bridge_controller',
        'core.notifier',
        'core.tcp_server',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='HighlightAssist-Service-Manager',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # No console window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='assets/icon-128.png',
    version='version_info.txt',  # NEW: Add version info
)
```

**Add Version Info File (`version_info.txt`):**
```python
# UTF-8
#
# For more details about fixed file info:
# https://msdn.microsoft.com/en-us/library/ms646997.aspx
VSVersionInfo(
  ffi=FixedFileInfo(
    filevers=(2, 0, 0, 0),
    prodvers=(2, 0, 0, 0),
    mask=0x3f,
    flags=0x0,
    OS=0x40004,
    fileType=0x1,
    subtype=0x0,
    date=(0, 0)
  ),
  kids=[
    StringFileInfo(
      [
      StringTable(
        u'040904B0',
        [StringStruct(u'CompanyName', u'HighlightAssist'),
        StringStruct(u'FileDescription', u'HighlightAssist Service Manager'),
        StringStruct(u'FileVersion', u'2.0.0'),
        StringStruct(u'InternalName', u'HighlightAssist-Service-Manager'),
        StringStruct(u'LegalCopyright', u'Copyright (c) 2025'),
        StringStruct(u'OriginalFilename', u'HighlightAssist-Service-Manager.exe'),
        StringStruct(u'ProductName', u'HighlightAssist'),
        StringStruct(u'ProductVersion', u'2.0.0')])
      ]),
    VarFileInfo([VarStruct(u'Translation', [1033, 1200])])
  ]
)
```

#### 3.2 Inno Setup Enhancements (`installer-config.iss`)

**Add Post-Install Validation:**
```pascal
[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
  ExePath: String;
begin
  // Existing code for stopping daemon...
  
  if CurStep = ssPostInstall then
  begin
    ExePath := ExpandConstant('{app}\HighlightAssist-Service-Manager.exe');
    
    // Validate executable exists
    if not FileExists(ExePath) then
    begin
      MsgBox('Warning: Service manager executable not found. Installation may be incomplete.', mbError, MB_OK);
      Exit;
    end;
    
    // Create startup shortcut
    CreateShortcut(
      ExpandConstant('{userstartup}\HighlightAssist.lnk'),
      '',
      ExePath,
      '',
      '',
      '',
      0,
      SW_SHOWNORMAL
    );
    
    // Ask to start now
    if MsgBox('Start HighlightAssist now?', mbConfirmation, MB_YESNO) = IDYES then
    begin
      Exec(ExePath, '', '', SW_HIDE, ewNoWait, ResultCode);
      
      // Wait 2 seconds and verify it started
      Sleep(2000);
      
      // Check if process is running (simplified check)
      if not FindWindowByClassName('Shell_TrayWnd') then  // Tray icon window
      begin
        MsgBox('Service started. Look for purple tray icon.', mbInformation, MB_OK);
      end;
    end;
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var ResultCode: Integer;
begin
  if CurUninstallStep = usUninstall then
  begin
    // Stop running daemon before uninstall
    Exec('cmd.exe', '/c taskkill /F /IM "HighlightAssist-Service-Manager.exe" /T', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Sleep(1000);  // Wait for processes to close
  end;
end;
```

**Add Auto-Start Configuration:**
```ini
[Registry]
; Add to Windows startup (optional, user choice)
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "HighlightAssist"; ValueData: """{app}\HighlightAssist-Service-Manager.exe"""; Flags: uninsdeletevalue; Tasks: startup

[Tasks]
Name: "startup"; Description: "Start HighlightAssist automatically when Windows starts"; GroupDescription: "Startup Options:"
Name: "desktop"; Description: "Create desktop shortcut"; GroupDescription: "Shortcut Options:"
```

---

### Phase 4: Testing & Validation

#### 4.1 Build Test Script (`test-build.ps1`)
```powershell
# Test complete build process
param(
    [switch]$Quick  # Skip installer, just test .exe
)

Write-Host "🏗️  HighlightAssist Build Test" -ForegroundColor Cyan

# 1. Clean previous builds
Write-Host "`n📁 Cleaning previous builds..." -ForegroundColor Yellow
Remove-Item -Path "build", "dist", "installers" -Recurse -Force -ErrorAction SilentlyContinue

# 2. Install dependencies
Write-Host "`n📦 Installing Python dependencies..." -ForegroundColor Yellow
python -m pip install --upgrade pip
pip install -r requirements.txt

# 3. Build with PyInstaller
Write-Host "`n🔨 Building service manager executable..." -ForegroundColor Yellow
pyinstaller --noconfirm --clean pyinstaller.spec

if (-not (Test-Path "dist\HighlightAssist-Service-Manager.exe")) {
    Write-Host "❌ Build failed - executable not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Executable built successfully" -ForegroundColor Green

# 4. Test executable
Write-Host "`n🧪 Testing executable..." -ForegroundColor Yellow
$proc = Start-Process -FilePath "dist\HighlightAssist-Service-Manager.exe" -ArgumentList "--no-tray" -PassThru -NoNewWindow

Start-Sleep -Seconds 3

# Check if process is running
if ($proc.HasExited) {
    Write-Host "❌ Executable crashed on startup!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Executable running (PID: $($proc.Id))" -ForegroundColor Green

# Test health endpoint
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5056/health" -TimeoutSec 5
    Write-Host "✅ Health endpoint responding: $($response | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health endpoint not responding!" -ForegroundColor Red
    Stop-Process -Id $proc.Id -Force
    exit 1
}

# Stop test process
Stop-Process -Id $proc.Id -Force
Write-Host "✅ Test process stopped" -ForegroundColor Green

if (-not $Quick) {
    # 5. Build installer
    Write-Host "`n📦 Building installer..." -ForegroundColor Yellow
    
    if (-not (Get-Command "iscc" -ErrorAction SilentlyContinue)) {
        Write-Host "⚠️  Inno Setup not found in PATH, trying default location..." -ForegroundColor Yellow
        $iscc = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
    } else {
        $iscc = "iscc"
    }
    
    & $iscc installer-config.iss
    
    if (Test-Path "installers\HighlightAssist-Setup-*.exe") {
        Write-Host "✅ Installer built successfully" -ForegroundColor Green
        Get-ChildItem "installers\*.exe" | ForEach-Object {
            $size = [math]::Round($_.Length / 1MB, 2)
            Write-Host "   📦 $($_.Name) ($size MB)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "❌ Installer build failed!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n✅ All tests passed!" -ForegroundColor Green
```

#### 4.2 Integration Test Suite

Create `tests/test_integration.py`:
```python
import pytest
import requests
import time
import subprocess
from pathlib import Path

class TestServiceManager:
    @pytest.fixture(scope="class")
    def service_process(self):
        """Start service manager for testing"""
        exe_path = Path("dist/HighlightAssist-Service-Manager.exe")
        assert exe_path.exists(), "Executable not found. Run build first."
        
        proc = subprocess.Popen([str(exe_path), "--no-tray", "--console"])
        time.sleep(3)  # Wait for startup
        
        yield proc
        
        proc.terminate()
        proc.wait(timeout=5)
    
    def test_health_endpoint(self, service_process):
        """Test health endpoint responds correctly"""
        response = requests.get("http://localhost:5056/health", timeout=5)
        assert response.status_code == 200
        data = response.json()
        assert data["service_manager"] == "running"
    
    def test_bridge_start(self, service_process):
        """Test bridge can be started via TCP command"""
        import socket
        import json
        
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect(("localhost", 5054))
        
        command = {"action": "start"}
        sock.sendall((json.dumps(command) + "\n").encode())
        
        response = sock.recv(4096).decode()
        data = json.loads(response)
        
        assert data["status"] in ["started", "already_running"]
        sock.close()
        
        time.sleep(2)
        
        # Verify bridge is accessible
        response = requests.get("http://localhost:5055/health", timeout=5)
        assert response.status_code == 200
    
    def test_bridge_stop(self, service_process):
        """Test bridge can be stopped"""
        import socket
        import json
        
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect(("localhost", 5054))
        
        command = {"action": "stop"}
        sock.sendall((json.dumps(command) + "\n").encode())
        
        response = sock.recv(4096).decode()
        data = json.loads(response)
        
        assert data["status"] == "stopped"
        sock.close()

# Run tests with: pytest tests/test_integration.py -v
```

---

## 📋 Implementation Checklist

### Sprint 1: Core Services (1-2 days)
- [ ] Add health check server to service_manager_v2.py (port 5056)
- [ ] Add bridge monitor with auto-recovery
- [ ] Enhance bridge.py with /ping and /metrics endpoints
- [ ] Add font fallback and validation to tray_icon.py
- [ ] Test all components in development environment

### Sprint 2: Extension Integration (2-3 days)
- [ ] Rewrite popup.js with state machine architecture
- [ ] Add real-time health checks (every 5 seconds)
- [ ] Implement actual daemon start/stop (not just instructions)
- [ ] Rewrite background.js with WebSocket monitoring
- [ ] Add auto-reconnect logic
- [ ] Test popup ↔ daemon communication flow

### Sprint 3: Installer & Packaging (2-3 days)
- [ ] Update pyinstaller.spec with all hidden imports
- [ ] Create version_info.txt for .exe metadata
- [ ] Test PyInstaller build on clean Windows VM
- [ ] Enhance installer-config.iss with post-install validation
- [ ] Add auto-start configuration
- [ ] Add uninstaller process cleanup
- [ ] Test installer on clean Windows VM

### Sprint 4: Testing & Validation (1-2 days)
- [ ] Create test-build.ps1 automated build script
- [ ] Create integration test suite (pytest)
- [ ] Test on Windows 10, Windows 11
- [ ] Test upgrade scenario (1.3.0 → 2.0.0)
- [ ] Test repair scenario
- [ ] Test uninstall cleanup

### Sprint 5: Documentation & Release (1 day)
- [ ] Update README.md with new architecture
- [ ] Create TROUBLESHOOTING.md with common issues
- [ ] Update installer screenshots
- [ ] Create release notes for v2.0.0
- [ ] Tag and push release
- [ ] Monitor GitHub Actions build

---

## 🎯 Success Criteria

### Must Have ✅
1. ✅ Installer detects existing installations (repair/upgrade)
2. ✅ Daemon starts on Windows login (auto-start)
3. ✅ Tray icon appears and is functional
4. ✅ Popup shows real-time daemon status
5. ✅ Start/Stop buttons actually work (no manual instructions)
6. ✅ Bridge auto-recovers from crashes
7. ✅ Uninstaller stops all processes before removal
8. ✅ Works on clean Windows 10/11 without manual dependencies

### Nice to Have 🌟
1. Update notification system
2. Crash reporting / telemetry
3. Bridge configuration UI (change ports)
4. Multi-language support
5. Themes for tray icon

---

## 🚨 Critical Risks

1. **PyInstaller Bundling**
   - Risk: pystray/PIL may not bundle correctly
   - Mitigation: Test on clean VM, add to hiddenimports
   
2. **Tray Icon Font Issues**
   - Risk: Arial font not available on all systems
   - Mitigation: Add fallback chain, test on multiple Windows versions

3. **WebSocket Reconnection**
   - Risk: Extension may lose connection permanently
   - Mitigation: Implement exponential backoff retry

4. **Daemon Auto-Start**
   - Risk: Startup shortcut may be blocked by antivirus
   - Mitigation: Add to Windows Registry Run key, test on multiple AVs

---

## 📞 Next Steps

**Immediate Action:**
1. Review this plan with stakeholders
2. Set up Windows VM for testing
3. Start Sprint 1 (Core Services)

**Questions to Answer:**
- Do we need native messaging or is WebSocket sufficient?
- Should we support Linux/macOS in v2.0 or Windows-only first?
- What's the update strategy? (auto-update vs manual download)

---

**Plan Version:** 1.0  
**Last Updated:** November 12, 2025  
**Status:** 🟡 DRAFT - Awaiting Approval
