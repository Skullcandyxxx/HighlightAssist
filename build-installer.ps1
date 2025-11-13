# HighlightAssist Windows Installer Build Script
# Creates a professional installer with PyInstaller + Inno Setup

param(
    [switch]$SkipPyInstaller,
    [switch]$SkipInnoSetup,
    [string]$Version = "1.2.1"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HighlightAssist Installer Builder v$Version" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check for required tools
Write-Host "[1/5] Checking requirements..." -ForegroundColor Yellow

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found! Install from https://python.org" -ForegroundColor Red
    exit 1
}

# Check PyInstaller
if (-not $SkipPyInstaller) {
    try {
        $pyinstallerVersion = pyinstaller --version 2>&1
        Write-Host "✓ PyInstaller: $pyinstallerVersion" -ForegroundColor Green
    } catch {
        Write-Host "✗ PyInstaller not found! Installing..." -ForegroundColor Yellow
        pip install pyinstaller
    }
}

# Check Inno Setup
if (-not $SkipInnoSetup) {
    $innoPath = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
    if (-not (Test-Path $innoPath)) {
        Write-Host "✗ Inno Setup not found at: $innoPath" -ForegroundColor Red
        Write-Host "  Download from: https://jrsoftware.org/isdl.php" -ForegroundColor Yellow
        Write-Host "  Or use -SkipInnoSetup to skip installer creation" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✓ Inno Setup found" -ForegroundColor Green
}

Write-Host ""

# Step 2: Build executable with PyInstaller
if (-not $SkipPyInstaller) {
    Write-Host "[2/5] Building executable with PyInstaller..." -ForegroundColor Yellow
    
    # Clean previous builds
    if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
    if (Test-Path "build") { Remove-Item -Recurse -Force "build" }
    
    # Build with spec file
    pyinstaller pyinstaller.spec --clean --noconfirm
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ PyInstaller build failed!" -ForegroundColor Red
        exit 1
    }
    
    # Verify EXE was created
    $exePath = "dist\HighlightAssist-Service-Manager.exe"
    if (Test-Path $exePath) {
        $exeSize = (Get-Item $exePath).Length / 1MB
        Write-Host "✓ Executable built: $exePath ($([math]::Round($exeSize, 2)) MB)" -ForegroundColor Green
    } else {
        Write-Host "✗ Executable not found at: $exePath" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[2/5] Skipping PyInstaller (using existing dist/)" -ForegroundColor Yellow
}

Write-Host ""

# Step 3: Copy icon assets
Write-Host "[3/5] Preparing installer assets..." -ForegroundColor Yellow

# Create icons directory if needed
if (-not (Test-Path "icons")) {
    New-Item -ItemType Directory -Path "icons" | Out-Null
}

# Copy icon files
if (Test-Path "assets\icon-128.png") {
    Copy-Item "assets\icon-128.png" "icons\icon128.png" -Force
    Write-Host "✓ Copied icon128.png" -ForegroundColor Green
}

# Create installer-assets directory
if (-not (Test-Path "installer-assets")) {
    New-Item -ItemType Directory -Path "installer-assets" | Out-Null
}

# Create INFO_BEFORE.txt
$infoBefore = @"
HighlightAssist Daemon - Installation

This installer will set up the HighlightAssist daemon service, which enables:

✓ Automatic localhost server management from browser extension
✓ Start, stop, and restart development servers (Vite, React, Next.js, etc.)
✓ System tray integration for easy access
✓ Auto-start with Windows (optional)

Requirements:
- Python 3.8 or higher (will be verified during installation)
- Windows 10/11 (64-bit recommended)

Installation Location:
By default, HighlightAssist installs to your user AppData folder, but you can choose a custom location on the next screen.

Click Next to continue.
"@

Set-Content "installer-assets\INFO_BEFORE.txt" $infoBefore
Write-Host "✓ Created INFO_BEFORE.txt" -ForegroundColor Green

# Create INFO_AFTER.txt
$infoAfter = @"
HighlightAssist Daemon - Installation Complete!

The daemon has been successfully installed.

Next Steps:
1. The daemon will start automatically (system tray icon with purple "H")
2. Install the HighlightAssist browser extension from Chrome Web Store
3. Click the extension icon on any localhost page to start managing servers

System Tray Icon:
Look for the purple "H" icon in your system tray (bottom-right corner).
Right-click it to:
- Start/Stop the bridge
- View connection status
- Open logs
- Exit the daemon

Auto-Start:
If you selected "Start automatically with Windows", the daemon will launch every time you log in.

Documentation:
Visit: https://github.com/Skullcandyxxx/HighlightAssist

Enjoy HighlightAssist!
"@

Set-Content "installer-assets\INFO_AFTER.txt" $infoAfter
Write-Host "✓ Created INFO_AFTER.txt" -ForegroundColor Green

Write-Host ""

# Step 4: Update Inno Setup config with version
Write-Host "[4/5] Updating installer configuration..." -ForegroundColor Yellow

$issContent = Get-Content "installer-config.iss" -Raw
$issContent = $issContent -replace '#define MyAppVersion ".*"', "#define MyAppVersion `"$Version`""
Set-Content "installer-config.iss" $issContent

Write-Host "✓ Updated version to $Version" -ForegroundColor Green
Write-Host ""

# Step 5: Build installer with Inno Setup
if (-not $SkipInnoSetup) {
    Write-Host "[5/5] Building installer with Inno Setup..." -ForegroundColor Yellow
    
    # Create installers directory
    if (-not (Test-Path "installers")) {
        New-Item -ItemType Directory -Path "installers" | Out-Null
    }
    
    # Build installer
    & "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" "installer-config.iss"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Inno Setup build failed!" -ForegroundColor Red
        exit 1
    }
    
    # Find the generated installer
    $installerPath = "installers\HighlightAssist-Setup-v$Version.exe"
    if (Test-Path $installerPath) {
        $installerSize = (Get-Item $installerPath).Length / 1MB
        Write-Host "✓ Installer created: $installerPath ($([math]::Round($installerSize, 2)) MB)" -ForegroundColor Green
    } else {
        Write-Host "✗ Installer not found at: $installerPath" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[5/5] Skipping Inno Setup" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Installer: installers\HighlightAssist-Setup-v$Version.exe" -ForegroundColor Cyan
Write-Host ""
Write-Host "To test the installer:" -ForegroundColor Yellow
Write-Host "  .\installers\HighlightAssist-Setup-v$Version.exe" -ForegroundColor White
Write-Host ""
Write-Host "To sign the installer (optional):" -ForegroundColor Yellow
Write-Host '  signtool sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 /a "installers\HighlightAssist-Setup-v' + $Version + '.exe"' -ForegroundColor White
Write-Host ""
