# HighlightAssist v2.0 - Quick Installation Guide

## 🚀 3-Step Installation

### Step 1: Install Browser Extension
1. **Chrome/Edge/Opera:**
   - Download latest release: https://github.com/Skullcandyxxx/HighlightAssist/releases/latest
   - Extract `HighlightAssist-v2.0.zip`
   - Open browser → Extensions → Developer mode ON
   - Click "Load unpacked" → Select extracted folder

2. **Verify Installation:**
   - Extension icon appears in toolbar
   - Click icon → Popup opens

---

### Step 2: Install Service Manager (Recommended)

**Windows:**
```powershell
# Download installer
# https://github.com/Skullcandyxxx/HighlightAssist/releases/download/v2.0.0/HighlightAssist-Setup-Windows.exe

# Run installer (GUI)
.\HighlightAssist-Setup-Windows.exe

# Options during installation:
# ✅ Desktop icon (optional - unchecked by default)
# ✅ Auto-start with Windows (recommended - checked by default)
# ✅ Launch now (optional - checked by default)
# ✅ Open logs folder (for developers - unchecked by default)
```

**macOS:**
```bash
# Download installer
# https://github.com/Skullcandyxxx/HighlightAssist/releases/download/v2.0.0/HighlightAssist-Setup-macOS.dmg

# Install
open HighlightAssist-Setup-macOS.dmg
# Drag to Applications folder
```

**Linux (Ubuntu/Debian):**
```bash
# Download .deb package
wget https://github.com/Skullcandyxxx/HighlightAssist/releases/download/v2.0.0/HighlightAssist-Setup-Linux.deb

# Install
sudo dpkg -i HighlightAssist-Setup-Linux.deb
sudo apt-get install -f  # Fix dependencies if needed

# Start service
systemctl --user start highlightassist
systemctl --user enable highlightassist  # Auto-start
```

---

### Step 3: Verify Installation

1. **Check Extension Popup:**
   - Click extension icon
   - Status pills should show:
     - 🟢 Daemon: Active
     - 🟢 Bridge: Active

2. **Check Tray Icon:**
   - Windows: System tray (bottom-right)
   - macOS: Menu bar (top-right)
   - Linux: System tray

3. **Test Server Detection:**
   - Start a dev server: `npm run dev` or `python -m http.server`
   - Click extension icon
   - Server should appear in "Running Servers" section

---

## 🛠️ Without Service Manager (Extension Only)

**Basic Features Still Work:**
- ✅ Element inspection on localhost pages
- ✅ Layer inspector (Photoshop-style)
- ✅ Element analysis and CSS extraction
- ✅ Keyboard shortcuts (Ctrl+Shift+H)

**Features Requiring Service Manager:**
- ❌ Automatic server detection
- ❌ Bridge auto-recovery
- ❌ Health monitoring
- ❌ AI assistant integration (WebSocket bridge)

---

## 🔧 Manual Service Manager Setup (Advanced)

If you prefer to run the service manager manually without installing:

**Windows:**
```powershell
# Install dependencies
cd HighlightAssist
pip install -r requirements.txt

# Run service manager
python service_manager_v2.py

# Or use the batch file
.\start-service.bat
```

**macOS/Linux:**
```bash
# Install dependencies
cd HighlightAssist
pip install -r requirements.txt

# Run service manager
python service_manager_v2.py
```

**What runs:**
- Health check server on port 5056
- Bridge server on port 5055
- TCP control server on port 5054
- Tray icon (requires GUI libraries)

---

## 📂 File Locations

### Windows
```
Installation:     C:\Program Files\HighlightAssist\
Logs:             %LOCALAPPDATA%\HighlightAssist\logs\
Registry Key:     HKCU\Software\Microsoft\Windows\CurrentVersion\Run\HighlightAssist
Uninstaller:      C:\Program Files\HighlightAssist\uninst\
```

### macOS
```
Installation:     /Applications/HighlightAssist.app/
Logs:             ~/Library/Logs/HighlightAssist/
LaunchAgent:      ~/Library/LaunchAgents/com.highlightassist.daemon.plist
```

### Linux
```
Installation:     /opt/highlightassist/
Logs:             ~/.local/share/highlightassist/logs/
Systemd Service:  ~/.config/systemd/user/highlightassist.service
```

---

## 🚨 Troubleshooting

### Extension not working
```
1. Refresh browser extension page (chrome://extensions)
2. Reload extension (toggle off/on)
3. Hard refresh page you're testing on (Ctrl+F5)
4. Check console for errors (F12)
```

### Daemon not starting
```
1. Check if port 5056 is already in use:
   Windows: netstat -ano | findstr :5056
   Linux/Mac: lsof -i :5056

2. Check logs:
   Windows: %LOCALAPPDATA%\HighlightAssist\logs\service-manager.log
   Linux/Mac: ~/.local/share/highlightassist/logs/service-manager.log

3. Try manual start:
   python service_manager_v2.py
```

### No servers detected
```
1. Verify dev server is running:
   curl http://localhost:3000  (or your port)

2. Check extension popup status pills
3. Click refresh button (🔄)
4. Check if daemon is running (green status pill)
```

### Bridge not connecting
```
1. Check daemon is running (required for bridge)
2. Verify port 5055 is open:
   curl http://localhost:5055/health

3. Check bridge monitor:
   - Should auto-restart if crashed
   - Max 5 restarts/hour (throttled)
   
4. Restart daemon:
   Windows: Right-click tray icon → Restart
   Linux/Mac: systemctl --user restart highlightassist
```

---

## 🔄 Uninstallation

### Windows
```
1. Run uninstaller:
   - Start Menu → HighlightAssist → Uninstall
   - Or: C:\Program Files\HighlightAssist\uninst\unins000.exe

2. Clean registry (automatic, but verify):
   - HKCU\Software\Microsoft\Windows\CurrentVersion\Run\HighlightAssist

3. Remove logs (optional):
   - Delete: %LOCALAPPDATA%\HighlightAssist\
```

### macOS
```
1. Drag from Applications to Trash
2. Remove LaunchAgent:
   rm ~/Library/LaunchAgents/com.highlightassist.daemon.plist
3. Remove logs (optional):
   rm -rf ~/Library/Logs/HighlightAssist/
```

### Linux
```
1. Remove package:
   sudo apt-get remove highlightassist  # Debian/Ubuntu
   sudo yum remove highlightassist      # RHEL/CentOS

2. Remove service:
   systemctl --user stop highlightassist
   systemctl --user disable highlightassist
   rm ~/.config/systemd/user/highlightassist.service

3. Remove logs (optional):
   rm -rf ~/.local/share/highlightassist/
```

---

## 📊 System Requirements

**Minimum:**
- OS: Windows 10, macOS 10.14, Ubuntu 18.04
- RAM: 100 MB (service manager)
- Disk: 50 MB
- Ports: 5054, 5055, 5056 (localhost only)

**Recommended:**
- OS: Windows 11, macOS 12+, Ubuntu 22.04+
- RAM: 200 MB
- Disk: 100 MB
- Python 3.8+ (if running manually)

**Browser Requirements:**
- Chrome 90+
- Edge 90+
- Opera 76+
- Firefox 88+ (upcoming)

---

## 🎯 Next Steps After Installation

1. **Test on a simple localhost server:**
   ```bash
   # Create test HTML file
   echo '<h1>Test</h1>' > test.html
   
   # Start server
   python -m http.server 8000
   
   # Open browser
   # http://localhost:8000/test.html
   
   # Click extension icon → Should see server detected
   ```

2. **Try element inspection:**
   - Click "Start Inspect" in popup
   - Or press `Ctrl+Shift+H`
   - Hover over elements → See highlights
   - Click element → Lock for analysis

3. **Explore features:**
   - Layer inspector (Photoshop-style z-index stack)
   - Framework detection (shows if React, Vue, etc.)
   - Send to AI assistant (via bridge)
   - View logs (developer option)

---

## 📚 Additional Resources

- **Full Documentation:** https://github.com/Skullcandyxxx/HighlightAssist/blob/master/README.md
- **Troubleshooting Guide:** https://github.com/Skullcandyxxx/HighlightAssist/blob/master/TROUBLESHOOTING.md
- **Feature List:** https://github.com/Skullcandyxxx/HighlightAssist/blob/master/FEATURES-v3.3.md
- **GitHub Issues:** https://github.com/Skullcandyxxx/HighlightAssist/issues

---

**🎉 You're all set! Happy debugging!**
