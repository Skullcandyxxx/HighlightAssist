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
    ],
    hiddenimports=[
        'win10toast',
        'notify2',
        'pync',
        'plyer',
        'pystray',
        'PIL.Image',
        'PIL.ImageDraw',
    ],
    hookspath=[],
    runtime_hooks=[],
    # Exclude common test and unused modules to reduce bundle size and AV flags
    excludes=[
        'tkinter', 'pytest', 'unittest', 'test', 'tests', 'pydoc', 'doctest',
        'email', 'html', 'http', 'xml', 'xmlrpc', 'sqlite3', 'turtle', 'distutils',
        'setuptools', 'pkg_resources', 'idlelib', 'lib2to3', 'pdb', 'cProfile', 'profile',
        'ensurepip', 'wsgiref', 'venv', 'asyncio', 'concurrent', 'multiprocessing',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=None)


# ...existing code...

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
    console=True,
    # version resource removed for compatibility
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='HighlightAssist-Service-Manager'
)

# --- Post-build: Windows code signing example ---
# To sign your exe after building, use:
# signtool sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 /a /n "Your Company Name" dist/HighlightAssist-Service-Manager/HighlightAssist-Service-Manager.exe