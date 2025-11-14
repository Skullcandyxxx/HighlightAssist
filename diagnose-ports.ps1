# HighlightAssist Port Diagnostics Tool
# Checks for port conflicts and orphaned processes

param(
    [switch]$KillOrphans,
    [switch]$Detailed
)

Write-Host "`n===========================================" -ForegroundColor Cyan
Write-Host "  HighlightAssist Port Diagnostics" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

$ports = @{
    "5054" = "TCP Control Server"
    "5055" = "Bridge WebSocket Server"
    "9999" = "Health Check / Dashboard"
}

# Function to check if port is in use
function Test-Port {
    param($Port)
    $connections = netstat -ano | Select-String ":$Port\s" | Select-String "LISTENING"
    return $connections
}

# Function to get process info from Process ID
function Get-ProcessInfo {
    param($ProcessId)
    try {
        $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        return $proc
    } catch {
        return $null
    }
}

Write-Host "`n[1] Checking HighlightAssist Ports..." -ForegroundColor Yellow

$orphanedProcesses = @()

foreach ($port in $ports.Keys | Sort-Object) {
    $service = $ports[$port]
    Write-Host "`n  Port $port ($service):" -ForegroundColor White
    
    $listening = Test-Port -Port $port
    
    if ($listening) {
        $listening | ForEach-Object {
            $line = $_.ToString().Trim()
            # Extract Process ID from netstat output (last column)
            if ($line -match '\s+(\d+)\s*$') {
                $processId = $Matches[1]
                $proc = Get-ProcessInfo -ProcessId $processId
                
                if ($proc) {
                    Write-Host "    ✅ LISTENING" -ForegroundColor Green
                    Write-Host "       Process: $($proc.ProcessName) (PID: $processId)" -ForegroundColor Gray
                    Write-Host "       Path: $($proc.Path)" -ForegroundColor Gray
                    Write-Host "       Started: $($proc.StartTime)" -ForegroundColor Gray
                    
                    # Check if it's an orphaned Python/bridge process
                    if ($proc.ProcessName -eq "python" -and $port -eq "5055") {
                        # Check if parent service manager is running
                        $serviceManager = Get-Process | Where-Object { 
                            $_.ProcessName -like "*HighlightAssist*" -or 
                            ($_.ProcessName -eq "python" -and $_.CommandLine -like "*service_manager*")
                        }
                        
                        if (-not $serviceManager -or $serviceManager.Count -eq 0) {
                            Write-Host "       ⚠️  WARNING: Orphaned bridge process (no service manager)" -ForegroundColor Yellow
                            $orphanedProcesses += @{PID = $processId; Process = $proc; Port = $port}
                        }
                    }
                } else {
                    Write-Host "    ✅ LISTENING (PID: $processId - process exited)" -ForegroundColor Gray
                }
            }
        }
    } else {
        Write-Host "    ❌ NOT LISTENING" -ForegroundColor Red
    }
}

# Check for TIME_WAIT connections (indicates recent activity/crashes)
Write-Host "`n[2] Checking TIME_WAIT Connections..." -ForegroundColor Yellow

foreach ($port in $ports.Keys | Sort-Object) {
    $timeWaitCount = (netstat -ano | Select-String ":$port\s" | Select-String "TIME_WAIT").Count
    
    if ($timeWaitCount -gt 0) {
        Write-Host "  Port ${port}: $timeWaitCount TIME_WAIT connections" -ForegroundColor Gray
        
        if ($timeWaitCount -gt 20) {
            Write-Host "    ⚠️  WARNING: High number of TIME_WAIT connections" -ForegroundColor Yellow
            Write-Host "    This indicates rapid connection cycling or crashes" -ForegroundColor Yellow
        }
    }
}

# Check service manager logs
Write-Host "`n[3] Checking Service Manager Logs..." -ForegroundColor Yellow

$logPath = "$env:LOCALAPPDATA\HighlightAssist\logs\service-manager.log"

if (Test-Path $logPath) {
    Write-Host "  Log file: $logPath" -ForegroundColor Gray
    
    # Count errors in last 100 lines
    $recentLogs = Get-Content $logPath -Tail 100
    $errorCount = ($recentLogs | Select-String "\[ERROR\]").Count
    $warningCount = ($recentLogs | Select-String "\[WARNING\]").Count
    $crashCount = ($recentLogs | Select-String "Bridge crashed").Count
    
    Write-Host "  Recent activity (last 100 lines):" -ForegroundColor Gray
    Write-Host "    Errors: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) {"Red"} else {"Green"})
    Write-Host "    Warnings: $warningCount" -ForegroundColor $(if ($warningCount -gt 5) {"Yellow"} else {"Green"})
    Write-Host "    Bridge crashes: $crashCount" -ForegroundColor $(if ($crashCount -gt 0) {"Red"} else {"Green"})
    
    if ($Detailed) {
        Write-Host "`n  Last 10 log entries:" -ForegroundColor Gray
        Get-Content $logPath -Tail 10 | ForEach-Object {
            if ($_ -match "\[ERROR\]") {
                Write-Host "    $_" -ForegroundColor Red
            } elseif ($_ -match "\[WARNING\]") {
                Write-Host "    $_" -ForegroundColor Yellow
            } else {
                Write-Host "    $_" -ForegroundColor Gray
            }
        }
    }
} else {
    Write-Host "  ❌ Log file not found" -ForegroundColor Red
}

# Check running processes
Write-Host "`n[4] Checking Running Processes..." -ForegroundColor Yellow

$haProcesses = Get-Process | Where-Object { 
    $_.ProcessName -like "*HighlightAssist*" -or 
    ($_.ProcessName -eq "python" -and $_.Path -like "*HighlightAssist*")
}

if ($haProcesses) {
    Write-Host "  Found $($haProcesses.Count) HighlightAssist process(es):" -ForegroundColor Green
    $haProcesses | ForEach-Object {
        Write-Host "    $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray
        Write-Host "      Started: $($_.StartTime)" -ForegroundColor Gray
    }
} else {
    Write-Host "  ❌ No HighlightAssist processes running" -ForegroundColor Red
}

# Summary and recommendations
Write-Host "`n===========================================" -ForegroundColor Cyan
Write-Host "  Summary & Recommendations" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

if ($orphanedProcesses.Count -gt 0) {
    Write-Host "`n⚠️  Found $($orphanedProcesses.Count) orphaned process(es)!" -ForegroundColor Yellow
    
    foreach ($orphan in $orphanedProcesses) {
        Write-Host "  - Port $($orphan.Port): $($orphan.Process.ProcessName) (PID: $($orphan.PID))" -ForegroundColor Yellow
    }
    
    if ($KillOrphans) {
        Write-Host "`n🔨 Killing orphaned processes..." -ForegroundColor Red
        foreach ($orphan in $orphanedProcesses) {
            try {
                Stop-Process -Id $orphan.PID -Force
                Write-Host "  ✅ Killed PID $($orphan.PID)" -ForegroundColor Green
            } catch {
                Write-Host "  ❌ Failed to kill PID $($orphan.PID): $_" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "`n  To kill orphaned processes, run:" -ForegroundColor Cyan
        Write-Host "    .\diagnose-ports.ps1 -KillOrphans" -ForegroundColor White
    }
}

if ($crashCount -gt 0) {
    Write-Host "`n⚠️  Bridge is crashing! Check logs:" -ForegroundColor Yellow
    Write-Host "    Get-Content `"$logPath`" -Tail 50" -ForegroundColor White
}

if ($timeWaitCount -gt 20) {
    Write-Host "`n⚠️  High TIME_WAIT connections detected!" -ForegroundColor Yellow
    Write-Host "  Possible causes:" -ForegroundColor Gray
    Write-Host "    - Rapid restarts/crashes" -ForegroundColor Gray
    Write-Host "    - Health check loops" -ForegroundColor Gray
    Write-Host "    - Client reconnection storms" -ForegroundColor Gray
}

Write-Host "`n✅ Diagnostic complete!`n" -ForegroundColor Green

# Best practices reminder
Write-Host "Best Practices:" -ForegroundColor Cyan
Write-Host "  1. Always stop service manager before restart:" -ForegroundColor Gray
Write-Host "     Stop-Process -Name 'HighlightAssist*' -Force" -ForegroundColor White
Write-Host "  2. Check for orphaned processes:" -ForegroundColor Gray
Write-Host "     .\diagnose-ports.ps1" -ForegroundColor White
Write-Host "  3. Monitor logs during development:" -ForegroundColor Gray
Write-Host "     Get-Content `"$logPath`" -Wait -Tail 20" -ForegroundColor White
Write-Host ""
