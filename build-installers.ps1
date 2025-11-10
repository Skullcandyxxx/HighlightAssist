# HighlightAssist Installer Builder
# Creates executable installers for Windows, Linux, and macOS

Write-Host "`n=== HighlightAssist Installer Builder ===" -ForegroundColor Cyan
Write-Host "Building cross-platform installers...`n" -ForegroundColor Yellow

# Ensure installers directory exists
New-Item -ItemType Directory -Force -Path "installers" | Out-Null

# ============================================
# WINDOWS .EXE INSTALLER
# ============================================
Write-Host "[1/3] Building Windows .exe installer..." -ForegroundColor Green

$batContent = Get-Content "install-windows.bat" -Raw

# Create PowerShell script that embeds the batch file
$ps1Installer = @"
# HighlightAssist Windows Installer
# Auto-generated executable installer

`$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " HighlightAssist Bridge Setup (Windows)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check for Python
Write-Host "[1/4] Checking for Python..." -ForegroundColor Yellow
try {
    `$pythonVersion = python --version 2>&1
    Write-Host "      Found: `$pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "      ERROR: Python not found!" -ForegroundColor Red
    Write-Host "      Please install Python 3.8+ from https://www.python.org/downloads/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Create temp directory for installation
`$tempDir = Join-Path `$env:TEMP "HighlightAssist"
New-Item -ItemType Directory -Force -Path `$tempDir | Out-Null

Write-Host "[2/4] Downloading HighlightAssist files..." -ForegroundColor Yellow
try {
    # Download required files
    `$files = @(
        "bridge.py",
        "service-manager.py",
        "requirements.txt"
    )
    
    foreach (`$file in `$files) {
        `$url = "https://raw.githubusercontent.com/Skullcandyxxx/HighlightAssist/master/`$file"
        `$dest = Join-Path `$tempDir `$file
        Invoke-WebRequest -Uri `$url -OutFile `$dest -UseBasicParsing
        Write-Host "      Downloaded: `$file" -ForegroundColor Gray
    }
    Write-Host "      All files downloaded successfully" -ForegroundColor Green
} catch {
    Write-Host "      ERROR: Failed to download files" -ForegroundColor Red
    Write-Host "      `$_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[3/4] Installing Python dependencies..." -ForegroundColor Yellow
try {
    Set-Location `$tempDir
    python -m pip install --upgrade pip --quiet
    python -m pip install -r requirements.txt --quiet
    Write-Host "      Dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "      ERROR: Failed to install dependencies" -ForegroundColor Red
    Write-Host "      `$_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[4/4] Setting up auto-start..." -ForegroundColor Yellow
try {
    # Create startup shortcut
    `$startupFolder = [Environment]::GetFolderPath('Startup')
    `$shortcutPath = Join-Path `$startupFolder "HighlightAssist-Bridge.lnk"
    
    `$pythonExe = (Get-Command python).Source
    `$bridgeScript = Join-Path `$tempDir "service-manager.py"
    
    `$WshShell = New-Object -ComObject WScript.Shell
    `$Shortcut = `$WshShell.CreateShortcut(`$shortcutPath)
    `$Shortcut.TargetPath = `$pythonExe
    `$Shortcut.Arguments = "`"`$bridgeScript`""
    `$Shortcut.WorkingDirectory = `$tempDir
    `$Shortcut.WindowStyle = 7  # Minimized
    `$Shortcut.Description = "HighlightAssist Bridge Service"
    `$Shortcut.Save()
    
    Write-Host "      Auto-start configured" -ForegroundColor Green
} catch {
    Write-Host "      WARNING: Could not setup auto-start" -ForegroundColor Yellow
    Write-Host "      You can start manually by running service-manager.py" -ForegroundColor Gray
}

# Start the service
Write-Host ""
Write-Host "Starting service..." -ForegroundColor Yellow
try {
    Start-Process -FilePath `$pythonExe -ArgumentList "`"`$bridgeScript`"" -WorkingDirectory `$tempDir -WindowStyle Minimized
    Start-Sleep -Seconds 2
    Write-Host "Service started successfully!" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Could not auto-start service" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "The HighlightAssist Bridge is now running on:" -ForegroundColor White
Write-Host "  ws://localhost:5055/ws" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service will auto-start on boot." -ForegroundColor Gray
Write-Host "Installation location: `$tempDir" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit"
"@

# Save PowerShell installer
$ps1Path = "installers\HighlightAssist-Setup.ps1"
Set-Content -Path $ps1Path -Value $ps1Installer -Encoding UTF8

# Create batch wrapper that runs PowerShell with execution policy bypass
$batWrapper = @"
@echo off
title HighlightAssist Installer
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0HighlightAssist-Setup.ps1"
"@

$batPath = "installers\HighlightAssist-Setup-Windows.bat"
Set-Content -Path $batPath -Value $batWrapper -Encoding ASCII

Write-Host "      Created: HighlightAssist-Setup-Windows.bat" -ForegroundColor Cyan

# ============================================
# LINUX INSTALLER (AppImage-style)
# ============================================
Write-Host "[2/3] Building Linux installer..." -ForegroundColor Green

$linuxInstaller = @'
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
'@

$linuxPath = "installers\HighlightAssist-Setup-Linux.sh"
Set-Content -Path $linuxPath -Value $linuxInstaller -Encoding UTF8
Write-Host "      Created: HighlightAssist-Setup-Linux.sh" -ForegroundColor Cyan

# ============================================
# MACOS INSTALLER
# ============================================
Write-Host "[3/3] Building macOS installer..." -ForegroundColor Green

$macosInstaller = @'
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
'@

$macosPath = "installers\HighlightAssist-Setup-macOS.sh"
Set-Content -Path $macosPath -Value $macosInstaller -Encoding UTF8
Write-Host "      Created: HighlightAssist-Setup-macOS.sh" -ForegroundColor Cyan

# ============================================
# SUMMARY
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Created installers:" -ForegroundColor White
Write-Host "  [Windows] installers\HighlightAssist-Setup-Windows.bat" -ForegroundColor Cyan
Write-Host "  [Linux]   installers\HighlightAssist-Setup-Linux.sh" -ForegroundColor Cyan
Write-Host "  [macOS]   installers\HighlightAssist-Setup-macOS.sh" -ForegroundColor Cyan
Write-Host ""
Write-Host "These installers will:" -ForegroundColor Yellow
Write-Host "  ✓ Check for Python" -ForegroundColor Gray
Write-Host "  ✓ Download latest bridge files from GitHub" -ForegroundColor Gray
Write-Host "  ✓ Install dependencies automatically" -ForegroundColor Gray
Write-Host "  ✓ Configure auto-start on boot" -ForegroundColor Gray
Write-Host "  ✓ Start the service immediately" -ForegroundColor Gray
Write-Host ""
