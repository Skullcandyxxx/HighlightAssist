# HighlightAssist Windows Service Installer
# Installs daemon as background service with auto-start

param(
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║     HighlightAssist Service Installer for Windows        ║" -ForegroundColor Magenta
Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Magenta

# Check for admin rights
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ This installer requires administrator privileges!" -ForegroundColor Red
    Write-Host "`n   Right-click this script and select 'Run as Administrator'`n" -ForegroundColor Yellow
    pause
    exit 1
}

$serviceName = "HighlightAssist"
$displayName = "HighlightAssist Daemon"
$description = "Background service for HighlightAssist browser extension - manages dev servers with purple tray icon"

# Get installation directory (current script location)
$installDir = $PSScriptRoot
$exePath = Join-Path $installDir "HighlightAssist-Service-Manager.exe"

if ($Uninstall) {
    Write-Host "🗑️  Uninstalling HighlightAssist Service...`n" -ForegroundColor Yellow
    
    # Stop service if running
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($service) {
        if ($service.Status -eq 'Running') {
            Write-Host "   Stopping service..." -ForegroundColor Gray
            Stop-Service -Name $serviceName -Force
        }
        
        Write-Host "   Removing service..." -ForegroundColor Gray
        sc.exe delete $serviceName | Out-Null
        Write-Host "   ✅ Service removed`n" -ForegroundColor Green
    } else {
        Write-Host "   ℹ️  Service not found (already uninstalled)`n" -ForegroundColor Cyan
    }
    
    # Remove from startup (shell:startup shortcut)
    $startupPath = [Environment]::GetFolderPath('Startup')
    $shortcut = Join-Path $startupPath "HighlightAssist.lnk"
    if (Test-Path $shortcut) {
        Remove-Item $shortcut -Force
        Write-Host "   ✅ Removed from startup`n" -ForegroundColor Green
    }
    
    Write-Host "✅ Uninstallation complete!`n" -ForegroundColor Green
    pause
    exit 0
}

# Installation
Write-Host "📦 Installing HighlightAssist Service...`n" -ForegroundColor Cyan

# Check if exe exists
if (-not (Test-Path $exePath)) {
    Write-Host "❌ Error: HighlightAssist-Service-Manager.exe not found!" -ForegroundColor Red
    Write-Host "`n   Expected location: $exePath" -ForegroundColor Gray
    Write-Host "`n   Please ensure you extracted all files to the same directory.`n" -ForegroundColor Yellow
    pause
    exit 1
}

# Check if Python is available (needed for bridge.py)
try {
    $pythonVersion = python --version 2>&1
    Write-Host "   ✅ Python detected: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Warning: Python not found in PATH" -ForegroundColor Yellow
    Write-Host "      The daemon requires Python for the bridge server." -ForegroundColor Gray
    Write-Host "      Install Python 3.9+ from: https://www.python.org/downloads/`n" -ForegroundColor Gray
}

# Check if service already exists
$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "   ℹ️  Service already exists - will update configuration" -ForegroundColor Cyan
    if ($existingService.Status -eq 'Running') {
        Write-Host "   Stopping existing service..." -ForegroundColor Gray
        Stop-Service -Name $serviceName -Force
    }
    sc.exe delete $serviceName | Out-Null
    Start-Sleep -Seconds 1
}

# Create service using NSSM (Non-Sucking Service Manager) approach
# Since we don't have NSSM, we'll use Task Scheduler instead for auto-start

Write-Host "`n   Creating startup task..." -ForegroundColor Gray

# Create scheduled task to run at login (better than service for tray apps)
$taskName = "HighlightAssist Daemon"
$action = New-ScheduledTaskAction -Execute $exePath -WorkingDirectory $installDir
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Remove existing task if present
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# Register new task
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description $description | Out-Null

Write-Host "   ✅ Scheduled task created (runs at login)`n" -ForegroundColor Green

# Create startup shortcut (alternative method)
Write-Host "   Creating startup shortcut..." -ForegroundColor Gray
$startupPath = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupPath "HighlightAssist.lnk"

$WScriptShell = New-Object -ComObject WScript.Shell
$shortcut = $WScriptShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $exePath
$shortcut.WorkingDirectory = $installDir
$shortcut.Description = "HighlightAssist Daemon - Dev Server Manager"
$shortcut.IconLocation = "$exePath,0"
$shortcut.WindowStyle = 7  # Minimized window
$shortcut.Save()

Write-Host "   ✅ Startup shortcut created`n" -ForegroundColor Green

# Create desktop shortcut (optional - for easy manual start)
Write-Host "   Creating desktop shortcut..." -ForegroundColor Gray
$desktopPath = [Environment]::GetFolderPath('Desktop')
$desktopShortcut = Join-Path $desktopPath "HighlightAssist Daemon.lnk"

$shortcut2 = $WScriptShell.CreateShortcut($desktopShortcut)
$shortcut2.TargetPath = $exePath
$shortcut2.WorkingDirectory = $installDir
$shortcut2.Description = "HighlightAssist Daemon - Click to start"
$shortcut2.IconLocation = "$exePath,0"
$shortcut2.Save()

Write-Host "   ✅ Desktop shortcut created`n" -ForegroundColor Green

# Install Python dependencies if Python is available
Write-Host "   Installing Python dependencies..." -ForegroundColor Gray
try {
    python -m pip install --quiet --upgrade pip
    python -m pip install --quiet fastapi uvicorn websockets pystray pillow
    Write-Host "   ✅ Python dependencies installed`n" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Could not install Python dependencies" -ForegroundColor Yellow
    Write-Host "      Run manually: pip install fastapi uvicorn websockets pystray pillow`n" -ForegroundColor Gray
}

# Start the daemon now
Write-Host "🚀 Starting HighlightAssist Daemon...`n" -ForegroundColor Cyan

try {
    Start-Process $exePath -WorkingDirectory $installDir -WindowStyle Hidden
    Start-Sleep -Seconds 2
    Write-Host "   ✅ Daemon started! Check system tray for purple icon 🟣`n" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Could not auto-start daemon" -ForegroundColor Yellow
    Write-Host "      You can start it manually from the desktop shortcut`n" -ForegroundColor Gray
}

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║               ✅ Installation Complete!                   ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "📍 Tray Icon:" -ForegroundColor Cyan
Write-Host "   Look for purple gradient icon in system tray (bottom-right)" -ForegroundColor Gray
Write-Host "   Right-click icon for menu (Start/Stop Bridge, Status, Exit)`n" -ForegroundColor Gray

Write-Host "🚀 Auto-Start:" -ForegroundColor Cyan
Write-Host "   ✅ Daemon will start automatically on Windows login" -ForegroundColor Gray
Write-Host "   ✅ Runs silently in background (no window)" -ForegroundColor Gray
Write-Host "   ✅ Shortcut added to Desktop for manual control`n" -ForegroundColor Gray

Write-Host "🌐 Usage:" -ForegroundColor Cyan
Write-Host "   1. Right-click tray icon → Start Bridge" -ForegroundColor Gray
Write-Host "   2. Open browser extension popup" -ForegroundColor Gray
Write-Host "   3. Click 'Start Server' to launch dev servers`n" -ForegroundColor Gray

Write-Host "🔧 Uninstall:" -ForegroundColor Cyan
Write-Host "   Run: .\install-windows-service.ps1 -Uninstall`n" -ForegroundColor Gray

Write-Host "📂 Installation Path:" -ForegroundColor Cyan
Write-Host "   $installDir`n" -ForegroundColor Gray

pause
