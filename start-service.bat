@echo off
REM HighlightAssist Service Manager - Runs in background like Bonjour
REM Prevent __pycache__ creation
set PYTHONDONTWRITEBYTECODE=1
title HighlightAssist Service
python service_manager_v2.py
