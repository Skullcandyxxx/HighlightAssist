#!/bin/bash
# HighlightAssist Installer for Linux/Ubuntu
# Auto-configures service to run at startup

echo "========================================"
echo "  HighlightAssist Setup (Linux)"
echo "========================================"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[X] Python 3 not found!"
    echo "    Install with: sudo apt install python3 python3-pip"
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

# Add to systemd (auto-start)
echo ""
echo "[2/3] Adding to system startup..."
SERVICE_FILE="$HOME/.config/systemd/user/highlightassist.service"
mkdir -p "$HOME/.config/systemd/user"

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=HighlightAssist Background Service (v2.0 OOP)
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 $(pwd)/service_manager_v2.py
Restart=on-failure

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable highlightassist.service
systemctl --user start highlightassist.service

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
