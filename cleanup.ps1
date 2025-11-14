# HighlightAssist Cleanup Script
# Stops all processes, verifies ports are free, and removes __pycache__ directories

Write-Host "`n🧹 Cleaning up HighlightAssist..." -ForegroundColor Cyan

# Remove __pycache__ directories (prevents browser extension loading errors)
Write-Host "`n📁 Removing __pycache__ directories..." -ForegroundColor Cyan
$pycacheRemoved = 0

# Remove root-level __pycache__ (critical - blocks extension loading)
if (Test-Path "__pycache__") {
    Remove-Item -Recurse -Force "__pycache__"
    Write-Host "  ✅ Removed root __pycache__" -ForegroundColor Green
    $pycacheRemoved++
}

# Remove core/__pycache__ 
if (Test-Path "core/__pycache__") {
    Remove-Item -Recurse -Force "core/__pycache__"
    Write-Host "  ✅ Removed core/__pycache__" -ForegroundColor Green
    $pycacheRemoved++
}

# Remove native_host/__pycache__
if (Test-Path "native_host/__pycache__") {
    Remove-Item -Recurse -Force "native_host/__pycache__"
    Write-Host "  ✅ Removed native_host/__pycache__" -ForegroundColor Green
    $pycacheRemoved++
}

if ($pycacheRemoved -eq 0) {
    Write-Host "  ℹ️  No __pycache__ directories found" -ForegroundColor Gray
}

# Stop service manager
$stopped = 0
Get-Process -Name "*HighlightAssist*" -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.Id -Force
    Write-Host "  ✅ Stopped $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Green
    $stopped++
}

# Stop Python processes related to HighlightAssist
Get-Process python -ErrorAction SilentlyContinue | Where-Object {
    $cmdline = (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
    $cmdline -like "*HighlightAssist*" -or 
    $cmdline -like "*bridge.py*" -or 
    $cmdline -like "*service_manager*"
} | ForEach-Object {
    Stop-Process -Id $_.Id -Force
    Write-Host "  ✅ Stopped Python bridge (PID: $($_.Id))" -ForegroundColor Green
    $stopped++
}

if ($stopped -eq 0) {
    Write-Host "  ℹ️  No processes were running" -ForegroundColor Gray
}

Write-Host "`n⏳ Waiting for ports to release..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Verify ports are free
Write-Host "`n🔍 Checking ports..." -ForegroundColor Cyan

$ports = @("5054", "5055", "9999")
$allClear = $true

foreach ($port in $ports) {
    $listening = netstat -ano | Select-String ":$port\s" | Select-String "LISTENING"
    
    if ($listening) {
        Write-Host "  ❌ Port $port still in use!" -ForegroundColor Red
        $allClear = $false
    } else {
        Write-Host "  ✅ Port $port is free" -ForegroundColor Green
    }
}

if ($allClear) {
    Write-Host "`n✅ Cleanup complete! All ports free.`n" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some ports still in use. Run diagnose-ports.ps1 for details.`n" -ForegroundColor Yellow
}
