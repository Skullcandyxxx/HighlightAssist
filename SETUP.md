#  Quick Setup

## First-Time Installation (One-Time Only)

1. **Run the installer:**
   - Double-click `install.bat`
   - This will:
     -  Install Python dependencies
     -  Add service to Windows startup
     -  Start the background service

2. **Load extension in browser:**
   - Chrome/Edge: Go to `chrome://extensions/` or `edge://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the HighlightAssist folder

## Using the Extension

1. Navigate to your localhost project (e.g., `http://localhost:3000`)
2. Open the HighlightAssist control panel (Ctrl+Shift+H)
3. Go to **Bridge** tab
4. Click ** Start** button
5. The service automatically launches the bridge!
6. Click "Send to AI" to send element analysis to your AI

## How It Works

The background service (similar to Apple Bonjour):
- Runs silently in the background
- Auto-starts when Windows boots
- Launches the bridge server when you click "Start" in the extension
- No manual terminal commands needed!

## Uninstall

To remove the auto-startup:
- Delete shortcut from: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\HighlightAssist.lnk`
