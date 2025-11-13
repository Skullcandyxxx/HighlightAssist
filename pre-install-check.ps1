# Pre-Installation Check for HighlightAssist
# Detects running service and offers to stop it before installation

param(
    [switch]$Silent = $false
)

$ErrorActionPreference = "Stop"

Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   HighlightAssist - Pre-Installation Check" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if process is running
$processName = "HighlightAssist-Service-Manager"
$runningProcesses = Get-Process -Name $processName -ErrorAction SilentlyContinue

if ($runningProcesses) {
    Write-Host "⚠️  HighlightAssist is currently running" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Running instances:" -ForegroundColor Gray
    foreach ($proc in $runningProcesses) {
        Write-Host "   • PID $($proc.Id) - Started $($proc.StartTime.ToString('HH:mm:ss'))" -ForegroundColor Gray
    }
    Write-Host ""
    
    if (-not $Silent) {
        # Interactive mode - ask user
        $response = Read-Host "Would you like to close HighlightAssist now? (Y/N)"
        
        if ($response -match '^[Yy]') {
            Write-Host ""
            Write-Host "Stopping HighlightAssist..." -ForegroundColor Yellow
            
            # Try to send TCP stop command first (graceful shutdown)
            try {
                $client = New-Object System.Net.Sockets.TcpClient
                $client.Connect("localhost", 5054)
                $stream = $client.GetStream()
                $writer = New-Object System.IO.StreamWriter($stream)
                $writer.WriteLine('{"action":"stop"}')
                $writer.Flush()
                Start-Sleep -Seconds 2
                $client.Close()
                Write-Host "✅ Sent graceful shutdown command" -ForegroundColor Green
            } catch {
                Write-Host "⚠️  Could not send graceful shutdown (TCP not responding)" -ForegroundColor Yellow
            }
            
            # Force stop if still running
            Start-Sleep -Seconds 1
            $stillRunning = Get-Process -Name $processName -ErrorAction SilentlyContinue
            if ($stillRunning) {
                Write-Host "Forcing process termination..." -ForegroundColor Yellow
                Stop-Process -Name $processName -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 1
            }
            
            # Verify stopped
            $finalCheck = Get-Process -Name $processName -ErrorAction SilentlyContinue
            if ($finalCheck) {
                Write-Host ""
                Write-Host "❌ ERROR: Could not stop HighlightAssist" -ForegroundColor Red
                Write-Host "   Please close it manually from system tray and try again." -ForegroundColor Red
                Write-Host ""
                exit 1
            } else {
                Write-Host "✅ HighlightAssist stopped successfully" -ForegroundColor Green
                Write-Host ""
            }
        } else {
            Write-Host ""
            Write-Host "❌ Installation cancelled" -ForegroundColor Red
            Write-Host "   Please close HighlightAssist manually before installing." -ForegroundColor Yellow
            Write-Host ""
            exit 1
        }
    } else {
        # Silent mode - auto-stop
        Write-Host "Silent mode: Auto-stopping HighlightAssist..." -ForegroundColor Yellow
        
        # Try graceful shutdown
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $client.Connect("localhost", 5054)
            $stream = $client.GetStream()
            $writer = New-Object System.IO.StreamWriter($stream)
            $writer.WriteLine('{"action":"stop"}')
            $writer.Flush()
            Start-Sleep -Seconds 2
            $client.Close()
        } catch {
            # Ignore TCP errors in silent mode
        }
        
        # Force stop
        Start-Sleep -Seconds 1
        Stop-Process -Name $processName -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
        
        $finalCheck = Get-Process -Name $processName -ErrorAction SilentlyContinue
        if ($finalCheck) {
            Write-Host "❌ ERROR: Could not stop running service" -ForegroundColor Red
            exit 1
        }
        Write-Host "✅ Service stopped" -ForegroundColor Green
    }
} else {
    Write-Host "✅ No running instances detected" -ForegroundColor Green
    Write-Host ""
}

# Check for previous installation
$installPath = "$env:LOCALAPPDATA\HighlightAssist"
if (Test-Path $installPath) {
    Write-Host "📁 Previous installation detected:" -ForegroundColor Yellow
    Write-Host "   Location: $installPath" -ForegroundColor Gray
    
    # Check version if metadata exists
    $metadataFile = Join-Path $installPath "install_info.json"
    if (Test-Path $metadataFile) {
        try {
            $metadata = Get-Content $metadataFile | ConvertFrom-Json
            Write-Host "   Version: $($metadata.version)" -ForegroundColor Gray
            Write-Host "   Installed: $($metadata.install_date)" -ForegroundColor Gray
        } catch {
            # Ignore JSON parse errors
        }
    }
    
    Write-Host ""
    if (-not $Silent) {
        $response = Read-Host "Overwrite existing installation? (Y/N)"
        if ($response -notmatch '^[Yy]') {
            Write-Host ""
            Write-Host "❌ Installation cancelled" -ForegroundColor Red
            Write-Host ""
            exit 1
        }
    } else {
        Write-Host "Silent mode: Will overwrite existing installation" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Check Python
Write-Host "🐍 Checking Python..." -ForegroundColor Cyan
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match 'Python (\d+)\.(\d+)') {
        $major = [int]$matches[1]
        $minor = [int]$matches[2]
        
        if ($major -eq 3 -and $minor -ge 8) {
            Write-Host "✅ Python $major.$minor detected" -ForegroundColor Green
        } elseif ($major -eq 3) {
            Write-Host "⚠️  Python $major.$minor detected (3.8+ recommended)" -ForegroundColor Yellow
        } else {
            Write-Host "❌ Python 3.8+ required (found Python $major.$minor)" -ForegroundColor Red
            exit 1
        }
    }
} catch {
    Write-Host "❌ Python not found in PATH" -ForegroundColor Red
    Write-Host "   Please install Python 3.8+ from python.org" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Check disk space (need at least 100MB)
$drive = (Get-Location).Drive
$freeSpace = (Get-PSDrive $drive.Name).Free / 1MB
if ($freeSpace -lt 100) {
    Write-Host "❌ Insufficient disk space (need 100MB, have $([math]::Round($freeSpace))MB)" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Pre-installation checks passed!" -ForegroundColor Green
Write-Host ""
Write-Host "Ready to install HighlightAssist" -ForegroundColor Cyan
Write-Host ""

exit 0
