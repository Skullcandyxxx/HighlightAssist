# HighlightAssist Troubleshooting Guide

This guide covers common issues and their solutions.

---

## Extension Installation Issues

### ❌ Error: "Cannot load extension with file or directory name `__pycache__`"

**Symptoms**:
- Windows notification appears when loading extension
- Browser shows: "Cannot load extension with file or directory name `__pycache__`. Filenames starting with "_" are reserved for use by the system."
- Extension fails to load

**Root Cause**:
Python automatically creates `__pycache__` directories when you run `.py` files. Browsers reject these directories because filenames starting with underscore are reserved for system use.

**Solution 1 - Automated Cleanup** (Recommended):
```powershell
# Windows (PowerShell) - Run from HighlightAssist directory
.\cleanup.ps1
```

```bash
# Linux/macOS
find . -type d -name "__pycache__" -exec rm -rf {} +
```

**Solution 2 - Manual Removal**:
```powershell
# Windows (PowerShell)
Remove-Item -Recurse -Force __pycache__
Remove-Item -Recurse -Force core\__pycache__
Remove-Item -Recurse -Force native_host\__pycache__
```

```bash
# Linux/macOS
rm -rf __pycache__
rm -rf core/__pycache__
rm -rf native_host/__pycache__
```

**Prevention**:
- Always run `cleanup.ps1` after running Python scripts
- Add `__pycache__/` to `.gitignore` (already included)
- Consider running Python scripts in a virtual environment outside the extension directory

**Why This Happens**:
1. You run a Python script (e.g., `python service_manager_v2.py`)
2. Python creates `__pycache__/` directory with compiled `.pyc` files
3. You try to load extension in browser
4. Browser scans all files/folders in extension directory
5. Browser rejects `__pycache__` because it starts with underscore
6. Extension loading fails

---

## Extension Runtime Issues

### ⚠️ "Extension not loaded on this page"

**Symptoms**:
- Popup shows warning message
- Overlay doesn't appear
- No element highlighting

**Cause**: Extension only works on localhost URLs

**Solution**:
1. Navigate to a localhost URL (e.g., `http://localhost:3000`)
2. Refresh page after loading extension (`Ctrl+F5` for hard reload)
3. Verify page is not blocked by Content Security Policy

**Localhost Detection**:
Extension works on:
- `http://localhost:*`
- `http://127.0.0.1:*`
- `http://[::1]:*`
- `http://*.local:*`
- Private network IPs: `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`

---

## Service Manager Issues

### 🔴 "Service Manager Not Running"

**Symptoms**:
- Status pills show red/offline
- Dashboard features unavailable
- "Install and start service manager" message shown

**Solution 1 - Auto-Start** (v3.0+):
1. Click "🚀 Start Service Manager" button in popup
2. If shows "📥 Not Installed":
   - Download installer from Step 2
   - Run installer
   - Click button again

**Solution 2 - Manual Start**:
```powershell
# Windows
cd d:\Projects\LawHub\HighlightAssist
python service_manager_v2.py
```

```bash
# Linux/macOS
cd /path/to/HighlightAssist
python3 service_manager_v2.py
```

**Solution 3 - Use Frozen Executable**:
```powershell
# Windows
cd d:\Projects\LawHub\HighlightAssist\dist
.\HighlightAssist-Service-Manager.exe
```

**Verification**:
- Open `http://localhost:9999` in browser
- Should show dashboard UI
- Status pills in popup should turn green

---

### ⚠️ Native Messaging Error: "Specified native messaging host not found"

**Symptoms**:
- Click "Start Service Manager" button
- Shows "📥 Not Installed" message
- Console error (visible in DevTools)

**Cause**: Native messaging host not installed yet (expected before installation)

**Solution**:
1. Download installer from popup (Step 2)
2. Run installer - installs native messaging host
3. Click "Start Service Manager" button again
4. Should now start successfully

**Not an Error**: This message is normal if you haven't installed the service manager yet. It's the button's way of checking if installation is needed.

---

## Port Conflicts

### 🔴 "Port 5054/5055/9999 already in use"

**Symptoms**:
- Service manager fails to start
- Dashboard not accessible
- Bridge connection errors

**Diagnosis**:
```powershell
# Windows
.\diagnose-ports.ps1
```

```bash
# Linux/macOS
lsof -i :5054
lsof -i :5055
lsof -i :9999
```

**Solution**:
```powershell
# Automated cleanup
.\cleanup.ps1

# Manual process termination
Get-Process -Name "HighlightAssist-Service-Manager" | Stop-Process -Force
```

---

## Overlay Panel Issues

### 🎨 Overlay Panel Won't Open

**Symptoms**:
- Click "Open GUI Panel" - nothing happens
- Keyboard shortcut `Ctrl+Shift+H` doesn't work

**Solutions**:

1. **Hard Refresh Page**:
   ```
   Ctrl+F5 (Windows/Linux)
   Cmd+Shift+R (macOS)
   ```

2. **Reload Extension**:
   - Chrome: `chrome://extensions` → Find HighlightAssist → Click reload (🔄)
   - Firefox: `about:debugging` → Reload

3. **Check Browser Console**:
   - Press `F12` to open DevTools
   - Look for errors in Console tab
   - Common issue: CSP blocking script injection

4. **Verify Content Script Loaded**:
   - DevTools → Sources → Content scripts
   - Should see `content.js` and `overlay-gui-oop.js`

---

### 🖱️ "Start Inspecting" Button Does Nothing

**Symptoms**:
- Click button - cursor doesn't change
- No element highlighting

**Cause**: Message passing between popup/content/overlay failed

**Solution**:
1. Close and reopen overlay panel
2. Refresh page (overlay reinjected)
3. Check console for "Overlay GUI loaded" message

---

## AI Features / Bridge Issues

### 🌉 Bridge Won't Start

**Symptoms**:
- "Start" button in Bridge tab stays inactive
- WebSocket connection fails
- AI requests not logged

**Solutions**:

1. **Check Python Dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

2. **Manual Bridge Start** (for debugging):
   ```powershell
   python -m uvicorn bridge:app --host=127.0.0.1 --port=5055 --reload
   ```

3. **Verify Bridge Health**:
   - Open `http://localhost:5055/health`
   - Should show: `{"status": "ok", "active_connections": 0}`

4. **Port Conflict**:
   - Run `.\diagnose-ports.ps1`
   - Kill any process using port 5055

---

### 📤 "Send to AI" Not Working

**Symptoms**:
- Click "Send to AI" - no response
- AI doesn't receive element data

**Requirements**:
1. Bridge must be running (port 5055)
2. Element must be locked first
3. AI assistant must be monitoring bridge output

**Verification**:
```powershell
# Check bridge is running
Test-NetConnection -ComputerName 127.0.0.1 -Port 5055 -InformationLevel Quiet
# Should return True

# Check WebSocket connection
# Open bridge terminal - should show:
# Client connected: ws://localhost:5055/ws
```

---

## Browser-Specific Issues

### Chrome/Edge

**CSP Errors**:
- Some localhost servers have strict Content Security Policies
- Overlay may not inject on these pages
- Solution: Add CSP bypass to server config (development only)

**Extension Permissions**:
- Ensure "Allow access to file URLs" is enabled (if testing file:// URLs)
- Verify host permissions include `http://localhost/*`

### Firefox

**Manifest V3 Compatibility**:
- Firefox may require Manifest V2 version
- Use compatibility branch if available

---

## Performance Issues

### 🐌 Slow Element Highlighting

**Cause**: Too many DOM mutations or complex CSS

**Solutions**:
1. Reduce overlay opacity (Settings tab)
2. Disable animations in browser DevTools
3. Simplify page structure (reduce nested elements)

### 💾 High Memory Usage

**Cause**: Large inspection history (Layers tab)

**Solution**:
- History limited to last 20 elements (automatic cleanup)
- Close overlay when not in use
- Refresh page to clear state

---

## Getting Additional Help

### Logs

**Service Manager Logs**:
```
Windows: %LOCALAPPDATA%\HighlightAssist\logs\service-manager.log
Linux: ~/.local/share/HighlightAssist/logs/service-manager.log
macOS: ~/Library/Application Support/HighlightAssist/logs/service-manager.log
```

**Extension Logs**:
1. Open popup
2. Click "📥 Export Logs"
3. Choose format (JSON/text/CSV)
4. Share with issue report

### Diagnostic Commands

```powershell
# Windows - Full system check
.\diagnose-ports.ps1
.\cleanup.ps1
python --version
pip list | Select-String "fastapi|uvicorn|websockets"
```

```bash
# Linux/macOS
lsof -i :5054,5055,9999
ps aux | grep -i highlight
python3 --version
pip3 list | grep -E "fastapi|uvicorn|websockets"
```

### Reporting Issues

When creating a GitHub issue, include:

1. **Environment**:
   - OS: Windows 11 / Ubuntu 22.04 / macOS 13.0
   - Browser: Chrome 120 / Firefox 121 / Edge 120
   - Python: 3.11.5
   - Extension version: 3.3.0

2. **Steps to Reproduce**:
   - Exact sequence of actions
   - Localhost URL being tested
   - Framework (Vite/React/etc.)

3. **Logs**:
   - Browser console errors (F12)
   - Service manager logs
   - Extension exported logs

4. **Screenshots**:
   - Error messages
   - Extension popup state
   - Dashboard status

### Community Support

- **GitHub Issues**: [Report bugs](https://github.com/Skullcandyxxx/HighlightAssist/issues)
- **GitHub Discussions**: [Ask questions](https://github.com/Skullcandyxxx/HighlightAssist/discussions)
- **Email**: [Author contact](https://github.com/Skullcandyxxx)

---

## Known Limitations

### Platform

- **Windows**: Fully supported
- **Linux**: Supported (notifications may vary by desktop environment)
- **macOS**: Supported (requires additional permissions for notifications)

### Browsers

- **Chrome/Edge**: Fully supported (Manifest V3)
- **Opera/Brave**: Supported (same as Chrome)
- **Firefox**: Limited support (requires Manifest V2 version)
- **Safari**: Not supported (different extension API)

### Development Servers

- **Vite**: ✅ Fully supported
- **Webpack**: ✅ Fully supported
- **Next.js**: ✅ Fully supported
- **Create React App**: ✅ Fully supported
- **Angular CLI**: ✅ Fully supported
- **Custom servers**: ✅ Works with any localhost server

---

**Last Updated**: November 13, 2025
**Version**: 3.3.0
