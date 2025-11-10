#!/bin/bash
# HighlightAssist Linux Installer
# Auto-generated executable installer

set -e

echo ""
echo "========================================"
echo " HighlightAssist Bridge Setup (Linux)"
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
    echo "      Please install Python 3.8+ using your package manager"
    read -p "Press Enter to exit"
    exit 1
fi

# Create installation directory
INSTALL_DIR="$HOME/.local/share/highlightassist"
mkdir -p "$INSTALL_DIR"

echo "[2/4] Downloading HighlightAssist files..."
cd "$INSTALL_DIR"
for file in bridge.py service-manager.py requirements.txt; do
    curl -sSL "https://raw.githubusercontent.com/Skullcandyxxx/HighlightAssist/master/$file" -o "$file"
    echo "      Downloaded: $file"
done
echo "      All files downloaded successfully"

echo "[3/4] Installing Python dependencies..."
$PYTHON_CMD -m pip install --user --upgrade pip --quiet
$PYTHON_CMD -m pip install --user -r requirements.txt --quiet
echo "      Dependencies installed"

echo "[4/4] Setting up auto-start..."
# Create systemd user service
mkdir -p "$HOME/.config/systemd/user"
cat > "$HOME/.config/systemd/user/highlightassist.service" << EOF
[Unit]
Description=HighlightAssist Bridge Service
After=network.target

[Service]
Type=simple
ExecStart=$(which $PYTHON_CMD) $INSTALL_DIR/service-manager.py
WorkingDirectory=$INSTALL_DIR
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF

# Enable and start service
systemctl --user daemon-reload
systemctl --user enable highlightassist.service
systemctl --user start highlightassist.service
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
echo "To check status: systemctl --user status highlightassist"
echo ""

read -p "Press Enter to exit"
