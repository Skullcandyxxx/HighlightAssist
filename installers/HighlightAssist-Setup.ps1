# HighlightAssist Windows Installer
# Auto-generated executable installer

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " HighlightAssist Bridge Setup (Windows)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check for Python
Write-Host "[1/4] Checking for Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "      Found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "      ERROR: Python not found!" -ForegroundColor Red
    Write-Host "      Please install Python 3.8+ from https://www.python.org/downloads/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Create temp directory for installation
$tempDir = Join-Path $env:TEMP "HighlightAssist"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

Write-Host "[2/4] Downloading HighlightAssist files..." -ForegroundColor Yellow
try {
    # Download required files
    $files = @(
        "bridge.py",
        "service-manager.py",
        "requirements.txt"
    )
    
    foreach ($file in $files) {
        $url = "https://raw.githubusercontent.com/Skullcandyxxx/HighlightAssist/master/$file"
        $dest = Join-Path $tempDir $file
        Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
        Write-Host "      Downloaded: $file" -ForegroundColor Gray
    }
    Write-Host "      All files downloaded successfully" -ForegroundColor Green
} catch {
    Write-Host "      ERROR: Failed to download files" -ForegroundColor Red
    Write-Host "      $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[3/4] Installing Python dependencies..." -ForegroundColor Yellow
try {
    Set-Location $tempDir
    python -m pip install --upgrade pip --quiet
    python -m pip install -r requirements.txt --quiet
    Write-Host "      Dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "      ERROR: Failed to install dependencies" -ForegroundColor Red
    Write-Host "      $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[4/4] Setting up auto-start..." -ForegroundColor Yellow
try {
    # Create startup shortcut
    $startupFolder = [Environment]::GetFolderPath('Startup')
    $shortcutPath = Join-Path $startupFolder "HighlightAssist-Bridge.lnk"
    
    $pythonExe = (Get-Command python).Source
    $bridgeScript = Join-Path $tempDir "service-manager.py"
    
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($shortcutPath)
    $Shortcut.TargetPath = $pythonExe
    # Quote the bridge script path properly for the shortcut
    $Shortcut.Arguments = '"' + $bridgeScript + '"'
    $Shortcut.WorkingDirectory = $tempDir
    $Shortcut.WindowStyle = 7  # Minimized
    $Shortcut.Description = "HighlightAssist Bridge Service"
    $Shortcut.Save()
    
    Write-Host "      Auto-start configured" -ForegroundColor Green
} catch {
    Write-Host "      WARNING: Could not setup auto-start" -ForegroundColor Yellow
    Write-Host "      You can start manually by running service-manager.py" -ForegroundColor Gray
}

# Start the service
Write-Host ""
Write-Host "Starting service..." -ForegroundColor Yellow
try {
    # Start the bridge script using Start-Process with ArgumentList to avoid quoting issues
    Start-Process -FilePath $pythonExe -ArgumentList $bridgeScript -WorkingDirectory $tempDir -WindowStyle Minimized
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
Write-Host "Installation location: $tempDir" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit"
