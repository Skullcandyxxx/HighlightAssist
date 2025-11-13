"""
HighlightAssist Professional Installer
Downloads and installs dependencies on-demand
Works offline with fallback instructions
"""
import sys
import subprocess
import os
from pathlib import Path
import json
import shutil

class HighlightAssistInstaller:
    """Professional installer with dependency management"""
    
    def __init__(self):
        self.app_name = "HighlightAssist"
        self.version = "3.0.0"
        self.install_dir = self._get_install_directory()
        self.venv_dir = self.install_dir / 'venv'  # Isolated virtual environment
        self.python_exe = sys.executable  # Current Python for venv creation
        self.venv_python = None  # Will be set after venv creation
        self.dependencies = [
            'fastapi',
            'uvicorn[standard]',
            'websockets',
            'pystray',
            'pillow',
            'psutil',
            'jinja2',
        ]
        self.optional_dependencies = [
            'win10toast',  # Windows notifications
            'plyer',       # Cross-platform notifications
        ]
        
    def _get_install_directory(self):
        """Get platform-specific install directory"""
        if sys.platform.startswith('win'):
            # Windows: %LOCALAPPDATA%\HighlightAssist
            return Path(os.environ.get('LOCALAPPDATA', '.')) / 'HighlightAssist'
        elif sys.platform == 'darwin':
            # macOS: ~/Library/Application Support/HighlightAssist
            return Path.home() / 'Library' / 'Application Support' / 'HighlightAssist'
        else:
            # Linux: ~/.local/share/highlightassist
            return Path.home() / '.local' / 'share' / 'highlightassist'
    
    def check_internet(self):
        """Check if internet connection is available"""
        try:
            import urllib.request
            urllib.request.urlopen('https://pypi.org', timeout=5)
            return True
        except:
            return False
    
    def check_python_version(self):
        """Ensure Python 3.8+ is installed"""
        version = sys.version_info
        if version.major < 3 or (version.major == 3 and version.minor < 8):
            print(f"❌ ERROR: Python 3.8+ required (found {version.major}.{version.minor})")
            print("   Download from: https://www.python.org/downloads/")
            return False
        
        print(f"✅ Python {version.major}.{version.minor}.{version.micro} detected")
        return True
    
    def install_dependencies(self, offline_mode=False):
        """Install required dependencies"""
        print("\n" + "="*60)
        print("📦 Installing Dependencies")
        print("="*60)
        
        if offline_mode:
            print("\n⚠️  OFFLINE MODE: Dependencies cannot be installed automatically")
            print("\nPlease install the following packages manually:")
            print("\n1. Connect to the internet")
            print("2. Run this command:")
            print(f"\n   pip install {' '.join(self.dependencies)}")
            print("\nOptional packages (recommended):")
            print(f"   pip install {' '.join(self.optional_dependencies)}")
            return False
        
        # Install required dependencies
        failed = []
        for package in self.dependencies:
            print(f"\n📥 Installing {package}...")
            try:
                result = subprocess.run(
                    [self.python_exe, '-m', 'pip', 'install', package, '--quiet'],
                    capture_output=True,
                    text=True,
                    timeout=120
                )
                if result.returncode == 0:
                    print(f"   ✅ {package} installed successfully")
                else:
                    print(f"   ❌ {package} failed: {result.stderr}")
                    failed.append(package)
            except Exception as e:
                print(f"   ❌ {package} failed: {e}")
                failed.append(package)
        
        # Install optional dependencies (don't fail on errors)
        for package in self.optional_dependencies:
            print(f"\n📥 Installing {package} (optional)...")
            try:
                subprocess.run(
                    [self.python_exe, '-m', 'pip', 'install', package, '--quiet'],
                    capture_output=True,
                    timeout=60
                )
                print(f"   ✅ {package} installed")
            except:
                print(f"   ⚠️  {package} skipped (optional)")
        
        if failed:
            print(f"\n❌ Failed to install: {', '.join(failed)}")
            return False
        
        print("\n✅ All required dependencies installed successfully!")
        return True
    
    def copy_files(self):
        """Copy application files to install directory"""
        print("\n" + "="*60)
        print("📂 Installing Application Files")
        print("="*60)
        
        # Create directories
        self.install_dir.mkdir(parents=True, exist_ok=True)
        (self.install_dir / 'core').mkdir(exist_ok=True)
        (self.install_dir / 'dashboard').mkdir(exist_ok=True)
        (self.install_dir / 'assets').mkdir(exist_ok=True)
        (self.install_dir / 'logs').mkdir(exist_ok=True)
        
        # Files to copy
        files_to_copy = [
            ('service_manager_v2.py', 'service_manager_v2.py'),
            ('bridge.py', 'bridge.py'),
            ('tray_icon.py', 'tray_icon.py'),
            ('web_dashboard.py', 'web_dashboard.py'),
            ('core/bridge_controller.py', 'core/bridge_controller.py'),
            ('core/tcp_server.py', 'core/tcp_server.py'),
            ('core/notifier.py', 'core/notifier.py'),
            ('core/health_server.py', 'core/health_server.py'),
            ('core/bridge_monitor.py', 'core/bridge_monitor.py'),
            ('core/project_manager.py', 'core/project_manager.py'),
            ('core/__init__.py', 'core/__init__.py'),
            ('dashboard/index.html', 'dashboard/index.html'),
            ('assets/icon-128.png', 'assets/icon-128.png'),
        ]
        
        source_dir = Path(__file__).parent
        copied = 0
        
        for src, dst in files_to_copy:
            src_path = source_dir / src
            dst_path = self.install_dir / dst
            
            if src_path.exists():
                shutil.copy2(src_path, dst_path)
                print(f"   ✅ {src}")
                copied += 1
            else:
                print(f"   ⚠️  {src} not found (skipped)")
        
        print(f"\n✅ Copied {copied}/{len(files_to_copy)} files to {self.install_dir}")
        return True
    
    def create_launcher(self):
        """Create platform-specific launcher"""
        print("\n" + "="*60)
        print("🚀 Creating Launcher")
        print("="*60)
        
        if sys.platform.startswith('win'):
            self._create_windows_launcher()
        elif sys.platform == 'darwin':
            self._create_macos_launcher()
        else:
            self._create_linux_launcher()
    
    def _create_windows_launcher(self):
        """Create Windows batch launcher"""
        launcher_path = self.install_dir / 'HighlightAssist.bat'
        
        launcher_content = f"""@echo off
REM HighlightAssist Launcher for Windows
REM Auto-generated by installer

cd /d "{self.install_dir}"
"{self.python_exe}" service_manager_v2.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: HighlightAssist failed to start
    echo Check logs in: {self.install_dir}\\logs
    pause
)
"""
        
        launcher_path.write_text(launcher_content)
        print(f"   ✅ Launcher: {launcher_path}")
        
        # Create desktop shortcut
        try:
            desktop = Path.home() / 'Desktop'
            shortcut_path = desktop / 'HighlightAssist.bat'
            shutil.copy2(launcher_path, shortcut_path)
            print(f"   ✅ Desktop shortcut created")
        except:
            print(f"   ⚠️  Desktop shortcut skipped")
        
        # Create Start Menu entry
        try:
            start_menu = Path(os.environ.get('APPDATA', '')) / 'Microsoft' / 'Windows' / 'Start Menu' / 'Programs'
            start_menu_path = start_menu / 'HighlightAssist.bat'
            shutil.copy2(launcher_path, start_menu_path)
            print(f"   ✅ Start Menu entry created")
        except:
            print(f"   ⚠️  Start Menu entry skipped")
    
    def _create_macos_launcher(self):
        """Create macOS launcher"""
        launcher_path = self.install_dir / 'launch.sh'
        
        launcher_content = f"""#!/bin/bash
# HighlightAssist Launcher for macOS

cd "{self.install_dir}"
"{self.python_exe}" service_manager_v2.py
"""
        
        launcher_path.write_text(launcher_content)
        os.chmod(launcher_path, 0o755)
        print(f"   ✅ Launcher: {launcher_path}")
    
    def _create_linux_launcher(self):
        """Create Linux launcher"""
        launcher_path = self.install_dir / 'launch.sh'
        
        launcher_content = f"""#!/bin/bash
# HighlightAssist Launcher for Linux

cd "{self.install_dir}"
"{self.python_exe}" service_manager_v2.py
"""
        
        launcher_path.write_text(launcher_content)
        os.chmod(launcher_path, 0o755)
        print(f"   ✅ Launcher: {launcher_path}")
    
    def create_uninstaller(self):
        """Create uninstaller script"""
        print("\n" + "="*60)
        print("🗑️  Creating Uninstaller")
        print("="*60)
        
        if sys.platform.startswith('win'):
            uninstall_path = self.install_dir / 'Uninstall.bat'
            uninstall_content = f"""@echo off
echo Uninstalling HighlightAssist...
echo.

REM Stop any running instances
taskkill /F /IM python.exe /FI "WINDOWTITLE eq HighlightAssist*" 2>nul

REM Remove installation directory
rd /s /q "{self.install_dir}"

REM Remove desktop shortcut
del "%USERPROFILE%\\Desktop\\HighlightAssist.bat" 2>nul

REM Remove Start Menu entry
del "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\HighlightAssist.bat" 2>nul

echo.
echo HighlightAssist has been uninstalled.
pause
"""
        else:
            uninstall_path = self.install_dir / 'uninstall.sh'
            uninstall_content = f"""#!/bin/bash
echo "Uninstalling HighlightAssist..."

# Stop any running instances
pkill -f "service_manager_v2.py"

# Remove installation directory
rm -rf "{self.install_dir}"

echo "HighlightAssist has been uninstalled."
"""
        
        uninstall_path.write_text(uninstall_content)
        if not sys.platform.startswith('win'):
            os.chmod(uninstall_path, 0o755)
        
        print(f"   ✅ Uninstaller: {uninstall_path}")
    
    def save_install_info(self):
        """Save installation metadata"""
        info = {
            'version': self.version,
            'install_date': str(Path(__file__).stat().st_mtime),
            'install_dir': str(self.install_dir),
            'python_exe': self.python_exe,
            'dependencies': self.dependencies
        }
        
        info_file = self.install_dir / 'install_info.json'
        info_file.write_text(json.dumps(info, indent=2))
    
    def run_installation(self):
        """Main installation workflow"""
        print("\n" + "="*70)
        print(f"   HighlightAssist v{self.version} - Professional Installer")
        print("="*70)
        
        # Step 1: Check Python version
        if not self.check_python_version():
            return False
        
        # Step 2: Check internet
        has_internet = self.check_internet()
        if has_internet:
            print("✅ Internet connection available")
        else:
            print("⚠️  No internet connection detected")
        
        # Step 3: Install dependencies
        if not self.install_dependencies(offline_mode=not has_internet):
            if not has_internet:
                print("\n" + "="*60)
                print("⚠️  MANUAL SETUP REQUIRED")
                print("="*60)
                print("\nInstallation will continue, but you must install dependencies manually.")
                input("\nPress Enter to continue after installing dependencies...")
            else:
                print("\n❌ Installation failed due to dependency errors")
                return False
        
        # Step 4: Copy files
        if not self.copy_files():
            print("\n❌ Installation failed during file copy")
            return False
        
        # Step 5: Create launcher
        self.create_launcher()
        
        # Step 6: Create uninstaller
        self.create_uninstaller()
        
        # Step 7: Save install info
        self.save_install_info()
        
        # Installation complete
        print("\n" + "="*70)
        print("   ✅ INSTALLATION COMPLETE!")
        print("="*70)
        print(f"\nInstalled to: {self.install_dir}")
        print(f"\nTo start HighlightAssist:")
        
        if sys.platform.startswith('win'):
            print(f"   - Double-click: {self.install_dir}\\HighlightAssist.bat")
            print(f"   - Or use desktop shortcut")
            print(f"\nDashboard: http://127.0.0.1:9999")
        else:
            print(f"   ./launch.sh")
        
        print(f"\nTo uninstall:")
        if sys.platform.startswith('win'):
            print(f"   {self.install_dir}\\Uninstall.bat")
        else:
            print(f"   ./uninstall.sh")
        
        return True


if __name__ == '__main__':
    installer = HighlightAssistInstaller()
    
    try:
        success = installer.run_installation()
        
        if success:
            print("\n🎉 Thank you for installing HighlightAssist!")
            sys.exit(0)
        else:
            print("\n❌ Installation failed. Please check the errors above.")
            sys.exit(1)
    
    except KeyboardInterrupt:
        print("\n\n❌ Installation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
