#  HighlightAssist - Universal Setup

Browser extension for element inspection with AI assistance. Works on **Windows, Linux, and macOS**.

## Platform-Specific Installation

###  Windows
```cmd
HighlightAssist-Setup-Windows.bat
```
Double-click the file. It will:
-  Install Python dependencies
-  Add service to Windows Startup
-  Start the background service

###  Linux (Ubuntu/Debian)
```bash
chmod +x HighlightAssist-Setup-Linux.sh
./HighlightAssist-Setup-Linux.sh
```
Installs as systemd user service (auto-starts on boot)

###  macOS
```bash
chmod +x HighlightAssist-Setup-macOS.sh
./HighlightAssist-Setup-macOS.sh
```
Installs as LaunchAgent (auto-starts on login)

---

## What Gets Installed

1. **Python Dependencies** (FastAPI, Uvicorn, WebSockets)
2. **Background Service** - Runs silently, similar to:
   - Windows: Background process in Startup folder
   - Linux: systemd user service
   - macOS: LaunchAgent
3. **Bridge Server** - Launched on-demand when you click "Start" in extension

## Using the Extension

1. **Load in Browser:**
   - Chrome/Edge: `chrome://extensions/`  Enable Developer mode  Load unpacked
   - Firefox: `about:debugging`  Load Temporary Add-on
   - Opera: `opera://extensions`  Load unpacked

2. **Navigate to localhost project** (e.g., `http://localhost:3000`)

3. **Open control panel:** Press `Ctrl+Shift+H` (or `Cmd+Shift+H` on Mac)

4. **Start Bridge:** Go to Bridge tab  Click  Start

5. **Use AI features:** Select element  Click "Send to AI"

## How It Works

```
            
 Browser                Service Manager         Bridge      
 Extension        (Port 5054)       (Port 5055) 
            
   Clicks "Start"        Launches bridge           Logs AI requests
                         Auto-starts w/ OS          to terminal
```

The service manager runs in the background (like Apple's Bonjour service) and auto-launches the bridge when you click "Start" in the extension.

## Requirements

- **Python 3.8+** ([Download](https://www.python.org/downloads/))
- Modern browser (Chrome, Edge, Firefox, Opera, Brave)
- AI assistant (GitHub Copilot, ChatGPT, Claude, or local LLM)

## Uninstall

### Windows
Delete: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\HighlightAssist.lnk`

### Linux
```bash
systemctl --user stop highlightassist.service
systemctl --user disable highlightassist.service
```

### macOS
```bash
launchctl unload ~/Library/LaunchAgents/com.highlightassist.service.plist
rm ~/Library/LaunchAgents/com.highlightassist.service.plist
```

## License

MIT License - Free for personal and commercial use
