# -*- mode: python ; coding: utf-8 -*-

# PyInstaller spec file for HighlightAssist Service Manager v2.0
# Updated for OOP modular architecture
import os
from pathlib import Path


# --- Metadata for version info and AV trust ---
a = Analysis(
    ['service_manager_v2.py'],
    pathex=['.'],
    binaries=[],
    datas=[
        ('assets/icon-128.png', 'assets'),
        ('core/__init__.py', 'core'),
        ('core/bridge_controller.py', 'core'),
        ('core/tcp_server.py', 'core'),
        ('core/notifier.py', 'core'),
        ('core/health_server.py', 'core'),
        ('core/bridge_monitor.py', 'core'),
        ('bridge.py', '.'),
        ('tray_icon.py', '.'),
    ],
    hiddenimports=[
        # Core dependencies
        'fastapi',
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'psutil',  # Process monitoring
        # Standard library for health_server.py
        'http.server',
        'http',
        # Platform-specific notification libraries (optional - code handles gracefully if missing)
        # 'win10toast',  # Windows only
        # 'notify2',     # Linux only  
        # 'pync',        # macOS only
        'plyer',         # Cross-platform fallback
        'pystray',       # System tray
        'PIL.Image',
        'PIL.ImageDraw',
        'PIL.ImageFont',
        # Core modules
        'core.bridge_controller',
        'core.tcp_server',
        'core.notifier',
        'core.health_server',
        'core.bridge_monitor',
    ],
    hookspath=[],
    runtime_hooks=[],
    # Exclude only truly unused modules to avoid dependency issues
    excludes=[
        'tkinter', 'pytest', 'unittest', 'test', 'tests', 'pydoc', 'doctest',
        'turtle', 'idlelib', 'lib2to3', 'pdb', 'cProfile', 'profile',
        'ensurepip', 'venv',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=None)

# Single-file executable (onefile mode)
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='HighlightAssist-Service-Manager',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,  # Disable UPX for AV compatibility
    console=False,  # No console window - runs silently with tray icon
    icon='assets/icon-128.png',  # Application icon
    # version resource removed for compatibility
)

# --- Post-build: Windows code signing example ---
# To sign your exe after building, use:
# signtool sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 /a /n "Your Company Name" dist/HighlightAssist-Service-Manager/HighlightAssist-Service-Manager.exe