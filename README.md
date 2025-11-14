# HighlightAssist - Visual UI Debugger for Developers

<div align="center">

![Version](https://img.shields.io/badge/version-3.3.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)
![Chrome](https://img.shields.io/badge/chrome-88%2B-blue.svg)

**Professional browser extension for localhost UI debugging with AI-powered element analysis**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 🎯 Overview

HighlightAssist is a powerful browser extension that transforms how developers debug UI on localhost. Instead of taking screenshots and describing issues to AI assistants, HighlightAssist captures **structured element context** with one click.

### Why HighlightAssist?

- **80% faster** than DevTools for Vite/React projects
- **Photoshop-style layer inspector** - visualize z-index stacks like never before
- **Direct AI integration** - send element data to GitHub Copilot, ChatGPT, Claude, or any AI assistant
- **Works completely offline** - no external servers, all processing on localhost
- **Cross-platform service** - auto-starts with your OS like Bonjour/mDNS

---

## ✨ Features

### 🔍 Visual Element Inspection

- **Hover-to-highlight** with real-time element info
- **Click-to-lock** elements for detailed analysis
- **Layer Explorer** - Photoshop-style z-index stack visualization
- **Framework detection** - Automatically identifies React, Vue, Angular, Svelte components

### 🎨 Layer Inspector (Unique Feature)

```
┌─────────────────────────────┐
│ 🎨 Layer Explorer          │
├─────────────────────────────┤
│ ▼ div.modal-overlay         │
│   │  2560×1440 • z-index 50 │
│   │  👁️ 🔒 📋              │
│ ▼ div.modal-content         │
│   │  800×600 • z-index 51   │
│   │  👁️ 🔒 📋              │
│ ▼ button.close              │
│   │  32×32 • z-index 52     │
│   │  👁️ 🔒 📋              │
└─────────────────────────────┘
```

- **Hide layers** - Toggle visibility with eye icon
- **Lock layers** - Select specific elements from stack
- **Copy selectors** - Get CSS selectors instantly
- **Visual previews** - See background colors/gradients

### 🤖 AI Assistant Integration

Send structured element data to your preferred AI:

```json
{
  "element": "button.submit-form",
  "html": "<button class=\"submit-form\" disabled>...",
  "css": {
    "backgroundColor": "rgb(59, 130, 246)",
    "fontSize": "14px",
    "padding": "12px 24px"
  },
  "dimensions": { "width": 120, "height": 48 },
  "framework": "React",
  "zIndex": 10
}
```

### ⚡ Performance

- **Minimal CPU usage** - <0.5% idle (v2.0 OOP architecture)
- **Lightweight** - ~500KB total extension size
- **Non-blocking** - Selector-based async I/O
- **Fast startup** - Modular ES6 imports

---

## 📦 Installation

### Quick Install (Recommended)

1. **Download installer** for your platform:
   - [Windows](https://github.com/Skullcandyxxx/HighlightAssist/releases/latest/download/HighlightAssist-Setup-Windows.bat)
   - [Linux](https://github.com/Skullcandyxxx/HighlightAssist/releases/latest/download/HighlightAssist-Setup-Linux.sh)
   - [macOS](https://github.com/Skullcandyxxx/HighlightAssist/releases/latest/download/HighlightAssist-Setup-macOS.sh)

2. **Run installer** - Auto-installs Python dependencies and service

3. **Load extension** in browser:
   ```
   Chrome/Edge: chrome://extensions → Developer mode → Load unpacked
   Firefox: about:debugging → Load Temporary Add-on
   ```

### Manual Installation

#### Prerequisites
- **Python 3.8+** ([Download](https://www.python.org/downloads/))
- Modern browser (Chrome 88+, Edge, Firefox, Opera, Brave)

#### Steps

```bash
# Clone repository
git clone https://github.com/Skullcandyxxx/HighlightAssist.git
cd HighlightAssist

# Prevent Python __pycache__ in extension directory (IMPORTANT!)
# Windows (PowerShell - run once):
.\setup-dev-env.ps1

# Linux/macOS (add to ~/.bashrc or ~/.zshrc):
echo 'export PYTHONDONTWRITEBYTECODE=1' >> ~/.bashrc
source ~/.bashrc

# Install Python dependencies (for service manager)
pip install -r requirements.txt

# Package extension for browser (removes 300+ MB of build artifacts!)
# Windows:
.\package-extension.ps1

# Linux/macOS:
./package-extension.sh

# Load extension in browser
# Chrome: chrome://extensions → Load unpacked → Select extension-package/ directory
# Size: ~200 KB instead of 300+ MB!
```

**Note**: Never load the repository root directly! It contains virtual environments, build artifacts, and Python dependencies totaling 300+ MB. Always use the `extension-package/` directory created by the packaging script.

---

## 🚀 Usage

### Basic Workflow

1. **Navigate to localhost** (e.g., `http://localhost:3000`)

2. **Open overlay panel** - Press `Ctrl+Shift+H` (or `Cmd+Shift+H` on Mac)

3. **Start inspecting** - Click "Start Inspecting" or use keyboard shortcut

4. **Lock element** - Click any element to freeze analysis

5. **Send to AI** - Click "📤 Send to AI" to share with your AI assistant

### Advanced Features

#### Layer Explorer

```
1. Click "🎨 Layer Explorer" button
2. Hover over any element on the page
3. See full z-index stack at cursor position
4. Hide/lock/copy layers as needed
```

#### Bridge Service (for AI features)

```
1. Go to "Bridge" tab in overlay
2. Click "Start" button
3. Service starts on ws://localhost:5055
4. AI requests now logged to terminal
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+H` | Toggle inspection mode |
| `Ctrl+Click` | Lock element (when auto-lock disabled) |
| `Esc` | Close overlay panel |

---

## 🔧 Troubleshooting

### Extension Not Working on This Page

**Problem**: Popup shows "Extension not loaded on this page"

**Solution**: Extension only works on localhost URLs. Refresh the page after loading extension.

### Dashboard Shows "Service Manager Not Running"

**Problem**: Status pills show red/offline

**Solution**:
1. Install service manager using installer (see Installation section)
2. Or manually start: `python service_manager_v2.py`
3. Verify dashboard opens at `http://localhost:9999`

For more issues, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md) or [GitHub Issues](https://github.com/Skullcandyxxx/HighlightAssist/issues).

---

## 📖 Documentation

### Project Structure

```
HighlightAssist/
├── manifest.json           # Extension manifest
├── popup.html/js          # Extension popup UI
├── content.js             # Content script injector
├── background.js          # Service worker
├── overlay-gui-oop.js     # Main overlay entry (v3.0 OOP)
├── modules/               # OOP overlay components
│   ├── OverlayManager.js
│   ├── StateManagerEnhanced.js
│   ├── UIRenderer.js
│   ├── EventHandler.js
│   ├── BridgeClient.js
│   ├── LayerInspector.js
│   └── ElementAnalyzer.js
├── core/                  # Service manager v2.0
│   ├── bridge_controller.py
│   ├── tcp_server.py
│   └── notifier.py
├── service_manager_v2.py  # Main service orchestrator
├── bridge.py              # WebSocket bridge (FastAPI)
└── docs/                  # Full documentation

```

### Key Files

- **[FEATURES-v3.3.md](docs/FEATURES-v3.3.md)** - Complete feature list and changelog
- **[OOP_REFACTOR_SUMMARY.md](OOP_REFACTOR_SUMMARY.md)** - Architecture documentation
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - v1.0 → v2.0 migration
- **[INSTALLER_UPDATE_SUMMARY.md](INSTALLER_UPDATE_SUMMARY.md)** - Deployment details

### Architecture

**Three-Layer Architecture:**

```
┌──────────────────────────────────────────────────┐
│ Browser Extension Layer                          │
│  - Overlay GUI (7 OOP modules)                   │
│  - Content script injection                      │
│  - Handshake protocol                            │
└──────────────────┬───────────────────────────────┘
                   │ WebSocket (port 5055)
┌──────────────────▼───────────────────────────────┐
│ WebSocket Bridge Layer (bridge.py)               │
│  - FastAPI/Uvicorn server                        │
│  - Logs structured element context               │
│  - Broadcasts to connected AI assistants         │
└──────────────────┬───────────────────────────────┘
                   │ TCP (port 5054)
┌──────────────────▼───────────────────────────────┐
│ Service Manager Layer (v2.0 OOP)                 │
│  - BridgeController (lifecycle management)       │
│  - TCPControlServer (selector-based async)       │
│  - NotificationManager (cross-platform)          │
│  - Auto-starts with OS                           │
└──────────────────────────────────────────────────┘
```

---

## 🔧 Development

### Build from Source

```bash
# Clone repository
git clone https://github.com/Skullcandyxxx/HighlightAssist.git
cd HighlightAssist

# Install development dependencies
pip install -r requirements.txt

# Generate icons (optional)
npm run build:icons

# Build installers
.\build-installers.ps1     # Cross-platform installers
.\build-windows-installer.ps1  # Windows .exe installer
```

### Testing

```bash
# Test service manager components
python test_service_manager.py --component bridge
python test_service_manager.py --component tcp
python test_service_manager.py --component notify

# Run all tests
python test_service_manager.py --all
```

### Extension Development

```powershell
# Load unpacked extension
# Chrome: chrome://extensions → Developer mode → Load unpacked

# Watch for changes (manual reload required)
# Use Ctrl+R on chrome://extensions after edits
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit changes** (`git commit -m 'Add amazing feature'`)
4. **Push to branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Code Style

- **JavaScript**: ES6+ modules, async/await preferred
- **Python**: PEP 8, type hints encouraged
- **Comments**: Explain "why", not "what"

### Reporting Issues

Use the [GitHub Issues](https://github.com/Skullcandyxxx/HighlightAssist/issues) page with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- Browser/OS version

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

Copyright (c) 2025 Skullcandyxxx

---

## 🙏 Acknowledgments

- **Inspiration**: DevTools, Firebug, Web Inspector
- **Architecture**: Service manager concept inspired by Bonjour/mDNS
- **Layer Inspector**: UI concept from Adobe Photoshop
- **AI Integration**: Built for GitHub Copilot, ChatGPT, Claude workflows

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Skullcandyxxx/HighlightAssist/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Skullcandyxxx/HighlightAssist/discussions)
- **Author**: [@Skullcandyxxx](https://github.com/Skullcandyxxx)

---

<div align="center">

**Made with ❤️ by [Skullcandyxxx](https://github.com/Skullcandyxxx)**

⭐ Star this repo if you find it helpful!

</div>
