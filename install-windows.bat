@echo off
REM HighlightAssist One-Time Setup - Installs service to run at startup
title HighlightAssist Setup

echo ========================================
echo   HighlightAssist One-Time Setup
echo ========================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [X] ERROR: Python not found!
    echo     Please install Python 3.8+ from: https://www.python.org/downloads/
    pause
    exit /b 1
)
echo [OK] Python found

REM Install dependencies
echo.
echo [1/3] Installing Python dependencies...
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt
if errorlevel 1 (
    echo [X] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed

REM Create startup shortcut
echo.
echo [2/3] Adding to Windows startup...
set SCRIPT_PATH=%~dp0start-service.bat
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_FOLDER%\HighlightAssist.lnk

REM Create VBS script to make shortcut
echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = "%SHORTCUT_PATH%" >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%SCRIPT_PATH%" >> CreateShortcut.vbs
echo oLink.WindowStyle = 7 >> CreateShortcut.vbs
echo oLink.Description = "HighlightAssist Background Service" >> CreateShortcut.vbs
echo oLink.Save >> CreateShortcut.vbs

cscript //nologo CreateShortcut.vbs
del CreateShortcut.vbs

if exist "%SHORTCUT_PATH%" (
    echo [OK] Added to startup
) else (
    echo [!] Warning: Could not add to startup
)

REM Start the service now
echo.
echo [3/3] Starting service...
start "" "%SCRIPT_PATH%"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo The HighlightAssist service is now running and will
echo auto-start when Windows boots.
echo.

echo You can now use the extension's "Start" button to
echo launch the bridge automatically!
echo.
pause
