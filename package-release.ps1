# HighlightAssist Release Packager
# Creates clean distribution packages for end-users

param(
    [string]$Version = "3.3.0"
)

Write-Host "`n📦 HighlightAssist Release Packager v$Version`n" -ForegroundColor Cyan

# Define output directory
$releaseDir = ".\release-v$Version"
# $timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"  # Reserved for future timestamped builds

# Clean up old release if exists
if (Test-Path $releaseDir) {
    Write-Host "🗑️  Removing old release directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $releaseDir
}

# Create release structure
New-Item -ItemType Directory -Path "$releaseDir" -Force | Out-Null
New-Item -ItemType Directory -Path "$releaseDir\extension" -Force | Out-Null
New-Item -ItemType Directory -Path "$releaseDir\service-manager" -Force | Out-Null

Write-Host "✅ Created release directory: $releaseDir`n" -ForegroundColor Green

# ============================================================================
# PART 1: Package Extension (Browser)
# ============================================================================

Write-Host "📋 Part 1: Packaging Browser Extension..." -ForegroundColor Cyan

$extensionFiles = @(
    "manifest.json",
    "background.js",
    "content.js",
    "popup-v2.html",
    "popup-v2.js",
    "overlay-gui-oop.js",
    "logger.js",
    "error-handler.js"
)

$extensionDirs = @("icons", "modules")

$extensionDest = "$releaseDir\extension"

foreach ($file in $extensionFiles) {
    if (Test-Path $file) {
        Copy-Item -Path $file -Destination $extensionDest -Force
        $size = [math]::Round((Get-Item $file).Length / 1KB, 2)
        Write-Host "  ✅ $file ($size KB)" -ForegroundColor Green
    }
}

foreach ($dir in $extensionDirs) {
    if (Test-Path $dir) {
        Copy-Item -Path $dir -Destination $extensionDest -Recurse -Force
        $count = (Get-ChildItem "$extensionDest\$dir" -Recurse -File).Count
        Write-Host "  ✅ $dir/ ($count files)" -ForegroundColor Green
    }
}

# Add essential docs for extension
Copy-Item -Path "LICENSE" -Destination $extensionDest -Force
Copy-Item -Path "README.md" -Destination $extensionDest -Force

$extensionSize = (Get-ChildItem $extensionDest -Recurse -File | Measure-Object -Property Length -Sum).Sum
Write-Host "  📊 Extension size: $([math]::Round($extensionSize/1KB, 2)) KB`n" -ForegroundColor White

# ============================================================================
# PART 2: Package Service Manager (Standalone Application)
# ============================================================================

Write-Host "📋 Part 2: Packaging Service Manager..." -ForegroundColor Cyan

$serviceFiles = @(
    # Python scripts
    "service_manager_v2.py",
    "bridge.py",
    "requirements.txt",
    
    # Installers
    "install-windows.bat",
    "install-linux.sh",
    "install-macos.sh",
    "start-service.bat",
    "start-bridge.bat",
    
    # Documentation
    "README.md",
    "TROUBLESHOOTING.md",
    "LICENSE",
    "SETUP.md",
    
    # Utilities
    "cleanup.ps1",
    "diagnose-ports.ps1",
    "setup-dev-env.ps1"
)

$serviceDirs = @("core", "dashboard", "native_host")

$serviceDest = "$releaseDir\service-manager"

foreach ($file in $serviceFiles) {
    if (Test-Path $file) {
        Copy-Item -Path $file -Destination $serviceDest -Force
        Write-Host "  ✅ $file" -ForegroundColor Green
    }
}

foreach ($dir in $serviceDirs) {
    if (Test-Path $dir) {
        # Exclude __pycache__ directories
        $items = Get-ChildItem -Path $dir -Recurse | Where-Object { $_.FullName -notlike "*__pycache__*" }
        foreach ($item in $items) {
            $relativePath = $item.FullName.Substring((Get-Item $dir).Parent.FullName.Length + 1)
            $destPath = Join-Path $serviceDest $relativePath
            
            if ($item.PSIsContainer) {
                New-Item -ItemType Directory -Path $destPath -Force | Out-Null
            } else {
                $destDir = Split-Path $destPath -Parent
                if (-not (Test-Path $destDir)) {
                    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
                }
                Copy-Item -Path $item.FullName -Destination $destPath -Force
            }
        }
        $count = (Get-ChildItem "$serviceDest\$dir" -Recurse -File -ErrorAction SilentlyContinue).Count
        Write-Host "  ✅ $dir/ ($count files)" -ForegroundColor Green
    }
}

# Copy frozen executable if exists
if (Test-Path "dist\HighlightAssist-Service-Manager.exe") {
    Copy-Item -Path "dist\HighlightAssist-Service-Manager.exe" -Destination $serviceDest -Force
    $exeSize = [math]::Round((Get-Item "dist\HighlightAssist-Service-Manager.exe").Length / 1MB, 2)
    Write-Host "  ✅ HighlightAssist-Service-Manager.exe ($exeSize MB)" -ForegroundColor Green
}

$serviceSize = (Get-ChildItem $serviceDest -Recurse -File | Measure-Object -Property Length -Sum).Sum
Write-Host "  📊 Service Manager size: $([math]::Round($serviceSize/1MB, 2)) MB`n" -ForegroundColor White

# ============================================================================
# PART 3: Create README for release
# ============================================================================

Write-Host "📋 Part 3: Creating release documentation..." -ForegroundColor Cyan

$releaseReadme = @"
# HighlightAssist v$Version - Release Package

This package contains everything you need to run HighlightAssist.

## 📦 Package Contents

### 1. Browser Extension (extension/)
- Size: ~200 KB
- Files: 32 files (extension code only)
- Install: Load as unpacked extension in browser

### 2. Service Manager (service-manager/)
- Size: ~20 MB (with executable) or ~500 KB (Python scripts only)
- Components:
  - HighlightAssist-Service-Manager.exe (Windows standalone)
  - Python scripts (cross-platform)
  - Dashboard web interface
  - Native messaging host
  - Installation scripts

## 🚀 Quick Start

### Install Browser Extension
1. Open browser (Chrome/Edge/Opera/Brave)
2. Go to: chrome://extensions
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the \`extension/\` folder
6. Extension icon appears in toolbar ✅

### Install Service Manager

**Option A: Windows Standalone (Recommended)**
1. Copy \`service-manager/HighlightAssist-Service-Manager.exe\` anywhere
2. Run it (runs in background)
3. Verify dashboard opens: http://localhost:9999

**Option B: Python (All Platforms)**
1. Install Python 3.8+ (https://python.org)
2. Open terminal in \`service-manager/\` folder
3. Install dependencies:
   \`\`\`
   pip install -r requirements.txt
   \`\`\`
4. Run service manager:
   \`\`\`
   python service_manager_v2.py
   \`\`\`
5. Verify dashboard: http://localhost:9999

## 📖 Documentation

- **README.md** - Full documentation
- **TROUBLESHOOTING.md** - Common issues and solutions
- **SETUP.md** - Detailed setup guide

## 🔧 Utilities

- **cleanup.ps1** - Clean up processes and ports
- **diagnose-ports.ps1** - Check port availability
- **setup-dev-env.ps1** - Configure development environment

## ⚙️ System Requirements

**Minimum:**
- OS: Windows 10, macOS 10.14, Ubuntu 18.04
- Browser: Chrome 88+, Edge 88+, Opera 76+
- RAM: 100 MB
- Disk: 50 MB
- Ports: 5054, 5055, 9999 (localhost only)

**For Python Option:**
- Python 3.8 or higher

## 📊 File Sizes

| Component | Size |
|-----------|------|
| Browser Extension | ~200 KB |
| Service Manager (EXE) | ~17 MB |
| Service Manager (Python) | ~500 KB |
| **Total** | **~17 MB** |

**Note**: Much smaller than development repository (300+ MB) which includes:
- Build artifacts
- Virtual environments
- Source control
- Development tools

## 🆘 Support

- **Issues**: https://github.com/Skullcandyxxx/HighlightAssist/issues
- **Discussions**: https://github.com/Skullcandyxxx/HighlightAssist/discussions
- **Documentation**: See README.md in each folder

## 📄 License

MIT License - See LICENSE file

---

**Version**: $Version
**Release Date**: $(Get-Date -Format "MMMM dd, yyyy")
**Package Type**: End-User Distribution
"@

$releaseReadme | Out-File -FilePath "$releaseDir\README.txt" -Encoding UTF8
Write-Host "  ✅ Created README.txt`n" -ForegroundColor Green

# ============================================================================
# PART 4: Create ZIP archives
# ============================================================================

Write-Host "📋 Part 4: Creating distribution archives..." -ForegroundColor Cyan

# ZIP 1: Extension only
$extensionZip = ".\HighlightAssist-Extension-v$Version.zip"
if (Test-Path $extensionZip) { Remove-Item $extensionZip -Force }
Compress-Archive -Path "$releaseDir\extension\*" -DestinationPath $extensionZip -Force
$zipSize = [math]::Round((Get-Item $extensionZip).Length / 1KB, 2)
Write-Host "  ✅ $extensionZip ($zipSize KB)" -ForegroundColor Green

# ZIP 2: Service Manager only
$serviceZip = ".\HighlightAssist-ServiceManager-v$Version.zip"
if (Test-Path $serviceZip) { Remove-Item $serviceZip -Force }
Compress-Archive -Path "$releaseDir\service-manager\*" -DestinationPath $serviceZip -Force
$zipSize = [math]::Round((Get-Item $serviceZip).Length / 1MB, 2)
Write-Host "  ✅ $serviceZip ($zipSize MB)" -ForegroundColor Green

# ZIP 3: Complete package
$completeZip = ".\HighlightAssist-Complete-v$Version.zip"
if (Test-Path $completeZip) { Remove-Item $completeZip -Force }
Compress-Archive -Path "$releaseDir\*" -DestinationPath $completeZip -Force
$zipSize = [math]::Round((Get-Item $completeZip).Length / 1MB, 2)
Write-Host "  ✅ $completeZip ($zipSize MB)" -ForegroundColor Green

# ============================================================================
# SUMMARY
# ============================================================================

Write-Host "`n✅ Release packaging complete!`n" -ForegroundColor Green

Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "  Release directory: $releaseDir" -ForegroundColor White
Write-Host "  Extension: ~200 KB" -ForegroundColor White
Write-Host "  Service Manager: ~17 MB" -ForegroundColor White
Write-Host "  Total: ~17 MB (vs 300+ MB development repo)" -ForegroundColor Green

Write-Host "`n📦 Distribution Files:" -ForegroundColor Cyan
Write-Host "  1. $extensionZip (Browser extension only)" -ForegroundColor White
Write-Host "  2. $serviceZip (Service manager only)" -ForegroundColor White
Write-Host "  3. $completeZip (Everything)" -ForegroundColor White

Write-Host "`n🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Test the release package" -ForegroundColor White
Write-Host "  2. Upload ZIPs to GitHub releases" -ForegroundColor White
Write-Host "  3. Update release notes" -ForegroundColor White
Write-Host "  4. Tag version: git tag v$Version`n" -ForegroundColor White

Write-Host "💡 Development vs Release:" -ForegroundColor Yellow
Write-Host "  Development repo: 311 MB (with .venv, build/, dist/, etc.)" -ForegroundColor Gray
Write-Host "  Release package: 17 MB (production files only)" -ForegroundColor Green
Write-Host "  Space saved: 294 MB (94% reduction)`n" -ForegroundColor Green
