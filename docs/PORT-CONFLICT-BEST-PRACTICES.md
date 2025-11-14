# Port Conflict & Orphaned Process Best Practices

## Problem Overview

When developing with HighlightAssist, you may encounter:
1. **Port conflicts** (errno 10048) - Port already in use
2. **Orphaned processes** - Bridge/service running without parent
3. **Rapid crash loops** - Bridge crashing and restarting repeatedly

## Root Causes

### 1. Orphaned Bridge Processes
```
Scenario: Service manager crashes/exits but bridge.py keeps running
Result: Port 5055 occupied, new service manager can't start bridge
```

### 2. Dashboard Port Conflicts
```
Scenario: Dashboard crashes while health check server still bound to port 9999
Result: New dashboard can't bind, falls back to 10000-10009
```

### 3. Rapid Restart Loops
```
Scenario: Bridge crashes → Monitor restarts → Crashes again → Loop
Result: Throttled after 5 restarts/hour, TIME_WAIT connections pile up
```

## Best Practices

### ✅ Before Starting Service Manager

**1. Check for existing processes:**
```powershell
.\diagnose-ports.ps1
```

**2. Kill all HighlightAssist processes:**
```powershell
# Safe method (recommended)
Stop-Process -Name "HighlightAssist-Service-Manager" -Force -ErrorAction SilentlyContinue
Get-Process | Where-Object { $_.ProcessName -eq "python" -and $_.CommandLine -like "*bridge.py*" } | Stop-Process -Force

# Nuclear option (kills all Python)
taskkill /F /IM "python.exe"
```

**3. Wait for ports to release:**
```powershell
Start-Sleep -Seconds 2
```

**4. Verify ports are free:**
```powershell
netstat -ano | Select-String "5054|5055|9999" | Select-String "LISTENING"
```
Should return **nothing** if all clear.

### ✅ During Development

**1. Monitor logs in real-time:**
```powershell
Get-Content "$env:LOCALAPPDATA\HighlightAssist\logs\service-manager.log" -Wait -Tail 20
```

**2. Check process health:**
```powershell
Get-Process | Where-Object { $_.ProcessName -like "*HighlightAssist*" } | Format-Table ProcessName, Id, StartTime, CPU
```

**3. Test individual ports:**
```powershell
Test-NetConnection -ComputerName 127.0.0.1 -Port 5055 -InformationLevel Quiet
```

### ✅ When Errors Occur

**1. Port conflict (errno 10048):**
```powershell
# Identify what's using the port
netstat -ano | Select-String ":<PORT>" | Select-String "LISTENING"

# Find the PID from output, then:
Get-Process -Id <PID> | Select-Object ProcessName, Path, StartTime

# Kill if orphaned:
Stop-Process -Id <PID> -Force
```

**2. Bridge crash loop:**
```powershell
# Check recent crashes
Get-Content "$env:LOCALAPPDATA\HighlightAssist\logs\service-manager.log" -Tail 50 | Select-String "Bridge crashed"

# Look for Python errors
Get-Content "$env:LOCALAPPDATA\HighlightAssist\logs\service-manager.log" -Tail 100 | Select-String "Traceback|Error|Exception"
```

**3. High TIME_WAIT connections:**
```powershell
# Count TIME_WAIT connections
(netstat -ano | Select-String ":5055" | Select-String "TIME_WAIT").Count

# If > 20, indicates rapid cycling - restart system or wait 2-4 minutes
```

### ✅ Clean Restart Workflow

**Full clean restart (recommended):**
```powershell
# 1. Stop everything
Stop-Process -Name "HighlightAssist-Service-Manager" -Force -ErrorAction SilentlyContinue
Get-Process | Where-Object { $_.ProcessName -eq "python" -and $_.Path -like "*HighlightAssist*" } | Stop-Process -Force

# 2. Wait for cleanup
Start-Sleep -Seconds 3

# 3. Verify clean state
.\diagnose-ports.ps1

# 4. Start fresh
python service_manager_v2.py
```

**Quick restart (development):**
```powershell
# Only if you're sure there are no orphans
Stop-Process -Name "HighlightAssist-Service-Manager" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
python service_manager_v2.py
```

## Diagnostic Commands Reference

### Port Status
```powershell
# Check all HighlightAssist ports
netstat -ano | Select-String "5054|5055|9999"

# Check specific port with process name
netstat -ano | Select-String ":5055" | Select-String "LISTENING" | ForEach-Object {
    $line = $_.ToString().Trim()
    if ($line -match '\s+(\d+)\s*$') {
        $pid = $Matches[1]
        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
        Write-Host "Port 5055 used by: $($proc.ProcessName) (PID: $pid)"
    }
}
```

### Process Status
```powershell
# All HighlightAssist processes
Get-Process | Where-Object { 
    $_.ProcessName -like "*HighlightAssist*" -or 
    ($_.ProcessName -eq "python" -and $_.Path -like "*HighlightAssist*")
} | Format-Table ProcessName, Id, StartTime, CPU

# Just Python processes
Get-Process python | Format-Table Id, StartTime, Path
```

### Log Analysis
```powershell
# Error count
(Get-Content "$env:LOCALAPPDATA\HighlightAssist\logs\service-manager.log" -Tail 100 | Select-String "\[ERROR\]").Count

# Recent crashes
Get-Content "$env:LOCALAPPDATA\HighlightAssist\logs\service-manager.log" -Tail 100 | Select-String "crashed|ERROR" | Select-Object -Last 10

# Live monitoring
Get-Content "$env:LOCALAPPDATA\HighlightAssist\logs\service-manager.log" -Wait -Tail 0
```

## Common Scenarios

### Scenario 1: "Port 5055 already in use"

**Diagnosis:**
```powershell
.\diagnose-ports.ps1
```

**Output shows:**
```
Port 5055 (Bridge WebSocket Server):
  ✅ LISTENING
     Process: python (PID: 12345)
     Path: C:\...\python.exe
     ⚠️  WARNING: Orphaned bridge process (no service manager)
```

**Solution:**
```powershell
.\diagnose-ports.ps1 -KillOrphans
```

### Scenario 2: "Bridge keeps crashing"

**Diagnosis:**
```powershell
Get-Content "$env:LOCALAPPDATA\HighlightAssist\logs\service-manager.log" -Tail 50 | Select-String "Bridge|ERROR"
```

**Common causes:**
- Missing dependencies (check `requirements.txt`)
- Port already in use (orphaned process)
- Python version mismatch (needs 3.9+)
- Corrupted preferences.json

**Solution:**
```powershell
# Check Python version
python --version  # Should be 3.9+

# Verify dependencies
pip install -r requirements.txt

# Reset preferences (if corrupted)
Remove-Item "$env:LOCALAPPDATA\HighlightAssist\preferences.json" -Force

# Try again
python service_manager_v2.py
```

### Scenario 3: "Too many TIME_WAIT connections"

**Diagnosis:**
```powershell
(netstat -ano | Select-String ":5055|:9999" | Select-String "TIME_WAIT").Count
```

**Output:**
```
57 TIME_WAIT connections
```

**Meaning:** Bridge or dashboard crashed/restarted 57 times recently.

**Solution:**
```powershell
# Wait for TCP timeout (2-4 minutes) OR restart system

# Force cleanup (Windows only)
netsh interface ipv4 delete arpcache

# Then do clean restart
.\diagnose-ports.ps1 -KillOrphans
Start-Sleep -Seconds 3
python service_manager_v2.py
```

## Automated Cleanup Script

Create `cleanup.ps1`:
```powershell
Write-Host "🧹 Cleaning up HighlightAssist processes..." -ForegroundColor Cyan

# Stop service manager
Stop-Process -Name "HighlightAssist-Service-Manager" -Force -ErrorAction SilentlyContinue

# Stop all Python processes running HighlightAssist code
Get-Process python -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*HighlightAssist*" -or
    $_.CommandLine -like "*bridge.py*" -or
    $_.CommandLine -like "*service_manager*"
} | Stop-Process -Force

Write-Host "⏳ Waiting for ports to release..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Verify cleanup
$remaining = Get-Process | Where-Object { 
    $_.ProcessName -like "*HighlightAssist*" -or 
    ($_.ProcessName -eq "python" -and $_.Path -like "*HighlightAssist*")
}

if ($remaining) {
    Write-Host "⚠️  Some processes still running:" -ForegroundColor Yellow
    $remaining | Format-Table ProcessName, Id
} else {
    Write-Host "✅ All processes stopped!" -ForegroundColor Green
}

# Check ports
$portsInUse = netstat -ano | Select-String "5054|5055|9999" | Select-String "LISTENING"
if ($portsInUse) {
    Write-Host "⚠️  Ports still in use:" -ForegroundColor Yellow
    $portsInUse
} else {
    Write-Host "✅ All ports free!" -ForegroundColor Green
}
```

## Prevention Strategies

### 1. Proper Shutdown Handling
```python
# In service_manager_v2.py
def shutdown_handler(signum, frame):
    """Clean shutdown on Ctrl+C"""
    logger.info("Shutdown signal received, cleaning up...")
    
    # Stop bridge first
    if manager.bridge:
        manager.bridge.stop()
    
    # Stop dashboard
    if manager.dashboard:
        manager.dashboard.stop()
    
    # Stop health server
    if manager.health_server:
        manager.health_server.stop()
    
    sys.exit(0)

signal.signal(signal.SIGINT, shutdown_handler)
signal.signal(signal.SIGTERM, shutdown_handler)
```

### 2. Health Checks with Timeout
```python
def _is_port_available(self, port, timeout=2):
    """Check if port is available with timeout"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex(('127.0.0.1', port))
        sock.close()
        return result != 0
    except Exception as e:
        logger.error(f"Port check failed: {e}")
        return False
```

### 3. Process Management
```python
def start_bridge(self):
    """Start bridge with proper process tracking"""
    # Kill any orphaned bridge first
    self._kill_orphaned_bridge()
    
    # Start new bridge
    process = subprocess.Popen([...])
    
    # Track PID for cleanup
    self.bridge_pid = process.pid
    
    return process
```

## Summary

**Golden Rule:** Always diagnose before forcing changes.

**Essential Commands:**
1. `.\diagnose-ports.ps1` - Know the state
2. `Get-Content <log> -Wait -Tail 20` - Watch what's happening
3. `Stop-Process -Force` - Clean up when needed

**Remember:**
- Orphaned processes are the #1 cause of port conflicts
- TIME_WAIT connections indicate recent crashes
- Logs tell you everything - read them first
- Clean restart beats forcing through errors
