# HighlightAssist Extension Packager
# Creates a clean, minimal extension directory for browser loading

Write-Host "`n📦 Packaging HighlightAssist Extension...`n" -ForegroundColor Cyan

# Define output directory
$outputDir = ".\extension-package"
# $timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"  # Reserved for future timestamped builds

# Remove old package if exists
if (Test-Path $outputDir) {
    Write-Host "🗑️  Removing old package..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $outputDir
}

# Create clean directory
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
Write-Host "✅ Created clean directory: $outputDir`n" -ForegroundColor Green

# Files and folders to include (ONLY what the browser needs)
$includePatterns = @(
    # Core extension files
    "manifest.json",
    "background.js",
    "content.js",
    "popup-v2.html",
    "popup-v2.js",
    "overlay-gui-oop.js",
    "logger.js",
    "error-handler.js",
    
    # Directories
    "icons/",
    "modules/",
    
    # Optional but useful
    "README.md",
    "LICENSE"
)

Write-Host "📋 Copying extension files..." -ForegroundColor Cyan

$copiedFiles = 0
$totalSize = 0

foreach ($pattern in $includePatterns) {
    $isDirectory = $pattern.EndsWith('/')
    $sourcePath = Join-Path $PWD $pattern.TrimEnd('/')
    
    if (Test-Path $sourcePath) {
        if ($isDirectory) {
            # Copy directory recursively
            $destPath = Join-Path $outputDir (Split-Path $pattern -Leaf)
            Copy-Item -Path $sourcePath -Destination $destPath -Recurse -Force
            
            $fileCount = (Get-ChildItem -Path $destPath -Recurse -File).Count
            $dirSize = (Get-ChildItem -Path $destPath -Recurse -File | Measure-Object -Property Length -Sum).Sum
            
            Write-Host "  ✅ $pattern ($fileCount files, $([math]::Round($dirSize/1KB, 2)) KB)" -ForegroundColor Green
            $copiedFiles += $fileCount
            $totalSize += $dirSize
        } else {
            # Copy single file
            $destPath = Join-Path $outputDir (Split-Path $pattern -Leaf)
            Copy-Item -Path $sourcePath -Destination $destPath -Force
            
            $fileSize = (Get-Item $sourcePath).Length
            Write-Host "  ✅ $pattern ($([math]::Round($fileSize/1KB, 2)) KB)" -ForegroundColor Green
            $copiedFiles++
            $totalSize += $fileSize
        }
    } else {
        Write-Host "  ⚠️  $pattern not found - skipping" -ForegroundColor Yellow
    }
}

Write-Host "`n📊 Package Summary:" -ForegroundColor Cyan
Write-Host "  Files copied: $copiedFiles" -ForegroundColor White
Write-Host "  Total size: $([math]::Round($totalSize/1KB, 2)) KB ($([math]::Round($totalSize/1MB, 2)) MB)" -ForegroundColor White
Write-Host "  Location: $outputDir" -ForegroundColor White

# Compare with full directory size
$fullDirSize = (Get-ChildItem -Path $PWD -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
$savedSpace = $fullDirSize - $totalSize
$percentReduction = [math]::Round(($savedSpace / $fullDirSize) * 100, 1)

Write-Host "`n💾 Space Savings:" -ForegroundColor Cyan
Write-Host "  Full directory: $([math]::Round($fullDirSize/1MB, 2)) MB" -ForegroundColor White
Write-Host "  Packaged extension: $([math]::Round($totalSize/1MB, 2)) MB" -ForegroundColor Green
Write-Host "  Saved: $([math]::Round($savedSpace/1MB, 2)) MB ($percentReduction% reduction)" -ForegroundColor Green

Write-Host "`n✅ Extension packaged successfully!`n" -ForegroundColor Green
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Open browser extensions page (chrome://extensions)" -ForegroundColor White
Write-Host "   2. Enable 'Developer mode'" -ForegroundColor White
Write-Host "   3. Click 'Load unpacked'" -ForegroundColor White
Write-Host "   4. Select: $outputDir" -ForegroundColor Yellow
Write-Host "   5. Extension will be ~$([math]::Round($totalSize/1KB, 0)) KB instead of $([math]::Round($fullDirSize/1MB, 0)) MB! 🎉`n" -ForegroundColor White

# Create a .zip for distribution
Write-Host "📦 Creating ZIP archive for distribution..." -ForegroundColor Cyan
$zipPath = ".\HighlightAssist-Extension-v$(Get-Date -Format 'yyyy-MM-dd').zip"

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Compress-Archive -Path "$outputDir\*" -DestinationPath $zipPath -Force
$zipSize = (Get-Item $zipPath).Length

Write-Host "  ✅ Created: $zipPath ($([math]::Round($zipSize/1KB, 2)) KB)`n" -ForegroundColor Green
