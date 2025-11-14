# 📁 HighlightAssist Project Structure Guide

## 🎯 Quick Start - What to Use:

### 🌐 **Testing the Browser Extension:**
```
Load this folder in your browser:
👉 browser-extension/
```
See `browser-extension/LOAD_ME.md` for detailed instructions.

### 🖥️ **Running the Service Manager (Daemon):**
```
Run the executable:
👉 dist/HighlightAssist-Service-Manager.exe
```
Or rebuild it: `pyinstaller --noconfirm --clean pyinstaller.spec`

---

## 📂 Directory Structure:

### ✅ **WORKING FOLDERS (Edit these):**

```
browser-extension/          ← 🌐 LOAD THIS in browser (v3.3.2)
├── manifest.json
├── popup-v2.html
├── popup-v2.js            (Updated links to v3.3.2)
├── background.js
├── content.js
├── overlay-gui-oop.js
├── modules/               (BridgeClient, ElementAnalyzer, etc.)
└── icons/

core/                      ← 🐍 Python service manager modules
├── bridge_controller.py
├── tcp_server.py
├── notifier.py
├── health_server.py
└── bridge_monitor.py

dashboard/                 ← 🌐 Web dashboard UI
└── index.html

Root directory files:      ← ⚙️ Configuration & scripts
├── bridge.py              (WebSocket bridge)
├── service_manager_v2.py  (Main service manager)
├── pyinstaller.spec       (Build config)
├── installer-config.iss   (Inno Setup config)
├── requirements.txt       (Python dependencies)
└── package.json           (Node dependencies)
```

### 🔨 **BUILD OUTPUT (Generated - can delete):**

```
dist/                      ← 💿 Built executable
└── HighlightAssist-Service-Manager.exe (23.75 MB)

build/                     ← 🗑️ PyInstaller temp files

extension-package/         ← ❌ OLD - has v3.3.1 (delete this)

release-v3.3.0/           ← ❌ VERY OLD (delete this)

installers/               ← 📦 Inno Setup output
└── HighlightAssist-Setup-v3.3.2.exe
```

### 🧰 **DEVELOPMENT:**

```
venv-build/               ← 🐍 Python virtual environment
node_modules/             ← 📦 Node.js dependencies
.vscode/                  ← ⚙️ VS Code settings
.github/workflows/        ← 🤖 GitHub Actions CI/CD
archive-old/              ← 🗃️ Old/deprecated files
```

---

## 🎯 Common Tasks:

### 1. Test the Extension:
```powershell
# Load in browser:
chrome://extensions → Load unpacked → browser-extension/
```

### 2. Build Service Manager:
```powershell
# Activate virtual environment
.\venv-build\Scripts\Activate.ps1

# Build executable
pyinstaller --noconfirm --clean pyinstaller.spec

# Output: dist/HighlightAssist-Service-Manager.exe
```

### 3. Test Service Manager Locally:
```powershell
# Run the built executable
.\dist\HighlightAssist-Service-Manager.exe

# Check ports:
# - 5054: TCP Control Server
# - 5055: WebSocket Bridge
# - 9999: Web Dashboard
```

### 4. Build Windows Installer:
```powershell
# Requires Inno Setup installed
iscc installer-config.iss

# Output: installers/HighlightAssist-Setup-v3.3.2.exe
```

### 5. Update Extension Version:
```powershell
# Edit these files:
1. browser-extension/popup-v2.js → Line 42: const version = '3.3.X'
2. browser-extension/popup-v2.html → Line 545: <div class="version-badge">v3.3.X</div>
3. browser-extension/manifest.json → Line 3: "version": "3.3.X"

# Then reload extension in browser
```

---

## 🗑️ Safe to Delete:

These folders are old/generated and can be deleted:

- ❌ `extension-package/` (old v3.3.1)
- ❌ `release-v3.3.0/` (very old)
- ❌ `build/` (PyInstaller temp - regenerates)
- ❌ `installers/` (Inno Setup output - regenerates)
- ❌ `archive-old/` (deprecated files)
- ❌ `node_modules/` (run `npm install` to regenerate)
- ❌ `venv-build/` (run `python -m venv venv-build` to regenerate)

---

## 📋 Release Checklist:

1. ✅ Update version in 3 files (see task #5 above)
2. ✅ Test extension locally (browser-extension/)
3. ✅ Build service manager (PyInstaller)
4. ✅ Test service manager (ports 5054, 5055, 9999)
5. ✅ Commit changes: `git commit -m "feat: ..."`
6. ✅ Push to master: `git push origin master`
7. ✅ Create tag: `git tag -a vX.X.X -m "..."`
8. ✅ Push tag: `git push origin vX.X.X`
9. ✅ GitHub Actions builds installers automatically
10. ✅ Verify release at: https://github.com/Skullcandyxxx/HighlightAssist/releases

---

## 🆘 Troubleshooting:

**"Extension has old version"**
→ Make sure you're loading `browser-extension/` not `extension-package/`

**"Service manager won't start"**
→ Check ports are free: `.\diagnose-ports.ps1`

**"PyInstaller build fails"**
→ Check requirements.txt has all dependencies
→ Verify jinja2 is installed

**"Inno Setup compilation error"**
→ Verify `dist/HighlightAssist-Service-Manager.exe` exists
→ Check installer-config.iss syntax

---

**Last Updated:** 2025-11-14  
**Current Version:** v3.3.2
