# Build HighlightAssist Windows Installer Locally
# This script builds the .exe installer using Inno Setup

$ErrorActionPreference = 'Stop'

Write-Host "`n=== HighlightAssist Windows Installer Builder ===" -ForegroundColor Cyan
Write-Host "Building professional .exe installer...`n" -ForegroundColor Yellow

# Check for Inno Setup
$innoSetupPath = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if (-not (Test-Path $innoSetupPath)) {
    Write-Host "ERROR: Inno Setup not found!" -ForegroundColor Red
    Write-Host "`nInno Setup is required to build Windows installers." -ForegroundColor Yellow
    Write-Host "`nInstallation options:" -ForegroundColor White
    Write-Host "  1. Using Chocolatey (recommended):" -ForegroundColor Gray
    Write-Host "     choco install innosetup -y" -ForegroundColor Cyan
    Write-Host "`n  2. Manual download:" -ForegroundColor Gray
    Write-Host "     https://jrsoftware.org/isdl.php" -ForegroundColor Cyan
    Write-Host "`nPress any key to open download page or Ctrl+C to cancel..."
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    Start-Process "https://jrsoftware.org/isdl.php"
    exit 1
}

Write-Host "[1/3] Checking prerequisites..." -ForegroundColor Green

# Ensure required files exist
$requiredFiles = @(
    "bridge.py",
    "service-manager.py", 
    "requirements.txt",
    "README.md",
    "LICENSE",
    "installer-config.iss"
)

foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "      ERROR: Missing file: $file" -ForegroundColor Red
        exit 1
    }
}
Write-Host "      All required files present" -ForegroundColor Gray

# Create placeholder wizard images if they don't exist
if (-not (Test-Path "installer-wizard-image.bmp")) {
    Write-Host "[2/3] Creating placeholder wizard images..." -ForegroundColor Green
    Write-Host "      (You can replace these with custom images later)" -ForegroundColor Gray
    
    # Note: These are placeholders - Inno Setup will use defaults
    # To customize, create 164x314 BMP for wizard-image and 55x58 BMP for small-image
}

Write-Host "[3/3] Building installer..." -ForegroundColor Green

try {
    # Build the installer
    $buildOutput = & $innoSetupPath "installer-config.iss" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      Build completed successfully!" -ForegroundColor Green
        
        # Find the created installer
        $installer = Get-ChildItem "installers\HighlightAssist-Setup-v*.exe" | Select-Object -First 1
        
        if ($installer) {
            $size = [math]::Round($installer.Length / 1MB, 2)
            Write-Host "`n========================================" -ForegroundColor Cyan
            Write-Host " Build Complete!" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Cyan
            Write-Host "`nInstaller created:" -ForegroundColor White
            Write-Host "  Location: $($installer.FullName)" -ForegroundColor Cyan
            Write-Host "  Size:     $size MB" -ForegroundColor Gray
            Write-Host "`nFeatures:" -ForegroundColor Yellow
            Write-Host "  ✓ Professional Windows installer (.exe)" -ForegroundColor Gray
            Write-Host "  ✓ Python dependency check" -ForegroundColor Gray
            Write-Host "  ✓ Automatic dependency installation" -ForegroundColor Gray
            Write-Host "  ✓ Start menu shortcuts" -ForegroundColor Gray
            Write-Host "  ✓ Auto-start on boot option" -ForegroundColor Gray
            Write-Host "  ✓ Easy uninstall via Control Panel" -ForegroundColor Gray
            Write-Host "`nTest the installer before distributing!" -ForegroundColor Yellow
            Write-Host ""
            
            # Offer to open the installers folder
            $openFolder = Read-Host "Open installers folder? (Y/n)"
            if ($openFolder -ne 'n') {
                explorer.exe (Resolve-Path "installers")
            }
        }
    } else {
        Write-Host "`nBuild failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host "`nBuild output:" -ForegroundColor Yellow
        Write-Host $buildOutput -ForegroundColor Gray
        exit 1
    }
} catch {
    Write-Host "`nERROR: Build failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
