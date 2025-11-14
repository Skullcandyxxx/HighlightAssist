# HighlightAssist Development Environment Setup
# Prevents __pycache__ creation to avoid browser extension loading errors

Write-Host "`n🔧 Setting up HighlightAssist development environment...`n" -ForegroundColor Cyan

# Set environment variable to prevent __pycache__ creation
Write-Host "📝 Configuring Python to skip bytecode generation..." -ForegroundColor Yellow

try {
    # Set for current user (persists across sessions)
    [System.Environment]::SetEnvironmentVariable('PYTHONDONTWRITEBYTECODE', '1', 'User')
    Write-Host "  ✅ Set PYTHONDONTWRITEBYTECODE=1 (User level)" -ForegroundColor Green
    
    # Also set for current session
    $env:PYTHONDONTWRITEBYTECODE = '1'
    Write-Host "  ✅ Applied to current PowerShell session" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Failed to set environment variable: $_" -ForegroundColor Red
    Write-Host "  💡 You can set it manually:" -ForegroundColor Yellow
    Write-Host "     Windows: System Properties → Environment Variables → New User Variable" -ForegroundColor Gray
    Write-Host "     Name: PYTHONDONTWRITEBYTECODE, Value: 1" -ForegroundColor Gray
}

# Clean up any existing __pycache__ directories
Write-Host "`n🧹 Cleaning up existing __pycache__ directories..." -ForegroundColor Yellow

$pycacheRemoved = 0
$pycacheDirs = Get-ChildItem -Path . -Directory -Filter "__pycache__" -Recurse -ErrorAction SilentlyContinue | 
               Where-Object { $_.FullName -notlike "*\.venv\*" -and $_.FullName -notlike "*\venv-build\*" }

foreach ($dir in $pycacheDirs) {
    try {
        Remove-Item -Path $dir.FullName -Recurse -Force
        Write-Host "  ✅ Removed: $($dir.FullName -replace [regex]::Escape($PWD.Path), '.')" -ForegroundColor Green
        $pycacheRemoved++
    } catch {
        Write-Host "  ⚠️  Could not remove: $($dir.FullName)" -ForegroundColor Yellow
    }
}

if ($pycacheRemoved -eq 0) {
    Write-Host "  ℹ️  No __pycache__ directories found (good!)" -ForegroundColor Gray
} else {
    Write-Host "  ✅ Removed $pycacheRemoved __pycache__ director$(if ($pycacheRemoved -eq 1) {'y'} else {'ies'})" -ForegroundColor Green
}

# Verify Python dependencies
Write-Host "`n📦 Checking Python dependencies..." -ForegroundColor Yellow

if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonVersion = python --version 2>&1
    Write-Host "  ✅ $pythonVersion" -ForegroundColor Green
    
    # Check if requirements.txt exists
    if (Test-Path "requirements.txt") {
        Write-Host "  💡 Install dependencies with: pip install -r requirements.txt" -ForegroundColor Cyan
    }
} else {
    Write-Host "  ❌ Python not found! Please install Python 3.8+" -ForegroundColor Red
    Write-Host "     Download from: https://www.python.org/downloads/" -ForegroundColor Gray
}

# Instructions
Write-Host "`n✅ Setup complete!`n" -ForegroundColor Green
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Restart PowerShell to apply environment variable" -ForegroundColor White
Write-Host "   2. Install dependencies: pip install -r requirements.txt" -ForegroundColor White
Write-Host "   3. Load extension in browser (chrome://extensions)" -ForegroundColor White
Write-Host "   4. Never worry about __pycache__ errors again! 🎉`n" -ForegroundColor White

Write-Host "💡 Note: This only affects Python scripts run from this directory." -ForegroundColor Gray
Write-Host "   Your global Python settings are unchanged.`n" -ForegroundColor Gray
