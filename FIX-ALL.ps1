# Run this to fix everything at once

Write-Host "`n🔧 FIXING ALL ISSUES..." -ForegroundColor Yellow

# Step 1: Kill old Vite server to reload React Router fix
Write-Host "`n1️⃣ Restarting Vite dev server (to apply React Router fix)..." -ForegroundColor Cyan
$viteProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*vite*" -or $_.CommandLine -like "*vite*" }
if ($viteProcess) {
    Stop-Process -Id $viteProcess.Id -Force
    Write-Host "   ✓ Old Vite server stopped" -ForegroundColor Green
    Start-Sleep -Seconds 2
}

# Start Vite in background
Write-Host "   Starting Vite dev server..." -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\Projects\LawHub\LawFirmProject'; npm run dev" -WindowStyle Minimized
Write-Host "   ✓ Vite server starting (check minimized window)" -ForegroundColor Green

Start-Sleep -Seconds 3

# Step 2: Create fresh extension package
Write-Host "`n2️⃣ Packaging latest extension..." -ForegroundColor Cyan
Set-Location "D:\Projects\LawHub\LawFirmProject\browser-extension"

if (Test-Path "HighlightAssist-LATEST.zip") {
    Remove-Item "HighlightAssist-LATEST.zip" -Force
}

Compress-Archive -Path manifest.json,popup.html,popup.js,background.js,content.js,injected.js,overlay-gui.js,logger.js,error-handler.js,LOGGING.md,TROUBLESHOOTING.md,RELOAD-GUIDE.md,README.md,icons -DestinationPath "HighlightAssist-LATEST.zip" -Force

Write-Host "   ✓ Extension packaged" -ForegroundColor Green

# Step 3: Instructions
Write-Host "`n3️⃣ NOW DO THESE STEPS MANUALLY:" -ForegroundColor Yellow
Write-Host "`n   IN BROWSER:" -ForegroundColor White
Write-Host "   1. Go to opera://extensions" -ForegroundColor Gray
Write-Host "   2. Click REMOVE on old 'Highlight Assist' extension" -ForegroundColor Gray
Write-Host "   3. Click 'Load unpacked'" -ForegroundColor Gray
Write-Host "   4. Select folder:" -ForegroundColor Gray
Write-Host "      D:\Projects\LawHub\LawFirmProject\browser-extension" -ForegroundColor Cyan
Write-Host "   5. Close and reopen localhost:3000 tab" -ForegroundColor Gray
Write-Host "   6. Wait for Vite to finish starting (~10 seconds)" -ForegroundColor Gray
Write-Host "   7. Hard refresh: Ctrl+Shift+R" -ForegroundColor Gray

Write-Host "`n   VERIFY IT WORKED:" -ForegroundColor White
Write-Host "   ✓ React Router warnings should be GONE" -ForegroundColor Gray
Write-Host "   ✓ Extension popup shows 4 buttons (not 3)" -ForegroundColor Gray
Write-Host "   ✓ 'Open GUI Panel' button is visible" -ForegroundColor Gray
Write-Host "   ✓ Console shows: [Highlight Assist] Content script loaded" -ForegroundColor Gray

Write-Host "`n4️⃣ TEST THE EXTENSION:" -ForegroundColor Yellow
Write-Host "   1. Click extension icon" -ForegroundColor Gray
Write-Host "   2. Click '🎨 Open GUI Panel'" -ForegroundColor Gray
Write-Host "   3. Overlay should appear on page" -ForegroundColor Gray
Write-Host "   4. Click '▶ Start Inspecting'" -ForegroundColor Gray
Write-Host "   5. Hover over elements - they should highlight" -ForegroundColor Gray

Write-Host "`n📋 IF STILL NOT WORKING:" -ForegroundColor Red
Write-Host "   Open console (F12) and run this:" -ForegroundColor Gray
Write-Host "   chrome.storage.local.get(null, d => console.log(JSON.stringify(d)))" -ForegroundColor Cyan
Write-Host "   Then send me the output!" -ForegroundColor Gray

Write-Host "`n🎯 Package created: HighlightAssist-LATEST.zip" -ForegroundColor Green
Write-Host "✅ Vite restarting in background window" -ForegroundColor Green
Write-Host "`n⏳ Wait 10 seconds for Vite, then follow manual steps above" -ForegroundColor Yellow
