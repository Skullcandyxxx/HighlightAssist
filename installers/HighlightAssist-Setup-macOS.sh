#!/bin/bash
# HighlightAssist macOS Installer
# Auto-generated executable installer

set -e

echo ""
echo "========================================"
echo " HighlightAssist Bridge Setup (macOS)"
echo "========================================"
echo ""

# Check for Python
echo "[1/4] Checking for Python..."
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    echo "      Found: $(python3 --version)"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
    echo "      Found: $(python --version)"
else
    echo "      ERROR: Python not found!"
    echo "      Please install Python 3.8+ from https://www.python.org/downloads/"
    read -p "Press Enter to exit"
    exit 1
fi

# Create installation directory
INSTALL_DIR="$HOME/Library/Application Support/HighlightAssist"
mkdir -p "$INSTALL_DIR"

echo "[2/4] Downloading HighlightAssist files..."
cd "$INSTALL_DIR"
for file in bridge.py service-manager.py requirements.txt; do
    curl -sSL "https://raw.githubusercontent.com/Skullcandyxxx/HighlightAssist/master/$file" -o "$file"
    echo "      Downloaded: $file"
done
echo "      All files downloaded successfully"

echo "[3/4] Installing Python dependencies..."
$PYTHON_CMD -m pip install --upgrade pip --quiet
$PYTHON_CMD -m pip install -r requirements.txt --quiet
echo "      Dependencies installed"

echo "[4/4] Setting up auto-start..."
# Create LaunchAgent
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$HOME/Library/LaunchAgents/com.highlightassist.service.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.highlightassist.service</string>
    <key>ProgramArguments</key>
    <array>
        <string>$(which $PYTHON_CMD)</string>
        <string>$INSTALL_DIR/service-manager.py</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$INSTALL_DIR</string>
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

# Load service
launchctl load "$HOME/Library/LaunchAgents/com.highlightassist.service.plist"
echo "      Auto-start configured"

echo ""
echo "========================================"
echo " Installation Complete!"
echo "========================================"
echo ""
echo "The HighlightAssist Bridge is now running on:"
echo "  ws://localhost:5055/ws"
echo ""
echo "Service will auto-start on boot."
echo "Installation location: $INSTALL_DIR"
echo ""
echo "To check status: launchctl list | grep highlightassist"
echo ""

read -p "Press Enter to exit"
