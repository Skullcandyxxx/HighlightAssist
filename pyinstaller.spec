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
        ('core/project_manager.py', 'core'),
        ('bridge.py', '.'),
        ('web_dashboard.py', '.'),
        ('dashboard/index.html', 'dashboard'),
        # tray_icon.py is imported as a module, NOT a data file!
    ],
    hiddenimports=[
        # Core dependencies
        'fastapi',
        'fastapi.responses',
        'fastapi.templating',
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
        'websockets',
        'websockets.client',
        'websockets.server',
        # HTTP server for health checks
        'http.server',
        'http',
        # Jinja2 templating (complete)
        'jinja2',
        'jinja2.loaders',
        'jinja2.runtime',
        'jinja2.compiler',
        'jinja2.filters',
        'jinja2.tests',
        'jinja2.utils',
        # Starlette (FastAPI dependency)
        'starlette',
        'starlette.applications',
        'starlette.routing',
        'starlette.responses',
        'starlette.requests',
        'starlette.websockets',
        'starlette.templating',
        # Pydantic (FastAPI dependency)
        'pydantic',
        'pydantic.fields',
        # GUI libraries
        'tkinter',  # Status window
        'tkinter.ttk',
        # Platform-specific notification libraries (optional)
        'plyer',         # Cross-platform fallback
        'pystray',       # System tray
        'PIL',
        'PIL.Image',
        'PIL.ImageDraw',
        'PIL.ImageFont',
        # Core modules
        'core.bridge_controller',
        'core.tcp_server',
        'core.notifier',
        'core.health_server',
        'core.bridge_monitor',
        'core.project_manager',
        'web_dashboard',
    ],
    hookspath=[],
    runtime_hooks=[],
    # Exclude only truly unused modules to avoid dependency issues
    excludes=[
        'pytest', 'unittest', 'test', 'tests', 'pydoc', 'doctest',
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