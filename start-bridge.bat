@echo off
REM Auto-setup script for HighlightAssist Bridge
REM Prevent __pycache__ creation
set PYTHONDONTWRITEBYTECODE=1

echo ========================================
echo   HighlightAssist Bridge Auto-Setup
echo ========================================

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found! Please install Python 3.8+ first.
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [1/3] Python found!

REM Install dependencies
echo [2/3] Installing dependencies...
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt

if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo [3/3] Starting bridge on port 5055...
echo.
python -m uvicorn bridge:app --host=127.0.0.1 --port=5055
