#!/bin/bash
# HighlightAssist Installer for macOS
# Auto-configures service to run at startup

echo "========================================"
echo "  HighlightAssist Setup (macOS)"
echo "========================================"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[X] Python 3 not found!"
    echo "    Install from: https://www.python.org/downloads/"
    exit 1
fi
echo "[OK] Python found"

# Install dependencies
echo ""
echo "[1/3] Installing dependencies..."
python3 -m pip install --quiet --upgrade pip
python3 -m pip install --quiet -r requirements.txt
if [ $? -ne 0 ]; then
    echo "[X] Failed to install dependencies"
    exit 1
fi
echo "[OK] Dependencies installed"

# Add to LaunchAgents (auto-start)
echo ""
echo "[2/3] Adding to system startup..."
PLIST_FILE="$HOME/Library/LaunchAgents/com.highlightassist.service.plist"
mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.highlightassist.service</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>$(pwd)/service-manager.py</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$HOME/Library/Logs/HighlightAssist.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/Library/Logs/HighlightAssist-error.log</string>
</dict>
</plist>
EOF

launchctl load "$PLIST_FILE"
launchctl start com.highlightassist.service

echo "[OK] Added to startup"

# Done
echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "Service is running and will auto-start on boot."
echo "You can now use the browser extension!"
echo ""
