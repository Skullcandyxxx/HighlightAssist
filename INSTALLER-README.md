# Building the Windows Installer

## Quick Start

### Using GitHub Actions (Recommended)
Push a tag to automatically build and release (use your next version tag):
```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

The GitHub Actions workflow will automatically:
- Build the `.exe` installer
- Create a GitHub release
- Upload all installers (Windows `.exe`, Linux `.sh`, macOS `.sh`)

### Building Locally

#### Prerequisites
Install Inno Setup:
```powershell
# Option 1: Using Chocolatey (recommended)
choco install innosetup -y

# Option 2: Manual download
# Visit: https://jrsoftware.org/isdl.php
```

#### Build Command
```powershell
.\build-windows-installer.ps1
```

The installer will be created in `installers/HighlightAssist-Setup-vX.Y.Z.exe` (version number is substituted by the release tag)

## Installer Features

✅ **Professional Windows Installer (.exe)**
- Modern gradient artwork, badges, and typography
- Info-before + info-after screens with privacy & disclaimer copy
- Python dependency check before installation
- Automatic pip dependency installation
- Start Menu shortcuts
- Desktop icon (optional)
- Auto-start on Windows boot (optional)
- Proper uninstall via Windows Control Panel
- Chrome/Edge native host registration for the browser extension

✅ **Tray & Notifications (optional)**
- The native host includes an optional system tray icon and desktop notifications (Start/Stop/Status) when platform support is available.
- The GitHub Actions build bundles tray/notification libraries so the distributed native host executable includes pystray, Pillow (PIL) and plyer by default. If the installer is built locally, install `requirements.txt` before building the native host to include these features.
- To customize the tray icon, place a PNG at `assets/icon-128.png` in the repository root before building.

✅ **License Display**
- Shows MIT license during installation
- Users must accept before proceeding

✅ **Silent Installation Support**
```cmd
HighlightAssist-Setup-vX.Y.Z.exe /SILENT
HighlightAssist-Setup-vX.Y.Z.exe /VERYSILENT /TASKS="autostart"
```

## Customization

### Adding Custom Icons
Replace or add these files:
- `icons/icon-128.png` - Application icon
- `installer-wizard-image.bmp` - Left panel image (164x314 pixels)
- `installer-wizard-small.bmp` - Header image (55x58 pixels)

### Modifying Installer
Edit `installer-config.iss` to customize:
- Company name and branding
- Install location
- Start menu group name
- Default tasks
- Additional files
- Registry entries
- InfoBefore/InfoAfter screens (`installer-assets/INFO_BEFORE.txt` + `INFO_AFTER.txt`)
- Native host manifest output paths

### Updating Branded Artwork
The GitHub workflow now auto-generates gradient BMPs with typography. To supply your own artwork:
- Replace `installer-wizard-image.bmp` (164 × 314) and `installer-wizard-small.bmp` (55 × 58) with custom designs.
- Or tweak the `Create installer images` step inside `.github/workflows/build-installer.yml` to draw different gradients, icons, or brand colors.

## Testing

Before releasing, test the installer:
1. Build locally: `.\build-windows-installer.ps1`
2. Run the installer on a clean Windows machine
3. Verify Python check works
4. Verify dependencies install correctly
5. Check auto-start functionality
6. Test uninstallation

## Troubleshooting

### "Python not found" during install
The installer checks for Python. Users need Python 3.8+ installed with the "Add to PATH" option checked.

### Build fails
Ensure:
- Inno Setup is installed correctly
- All required files exist (bridge.py, service-manager.py, etc.)
- LICENSE file is present in root directory

### Installer size concerns
The installer includes:
- Python scripts (~50KB)
- Requirements.txt
- README and LICENSE
- Icons
- Inno Setup overhead (~400KB)

Total size: ~500KB (dependencies downloaded during installation)

## Manual native host registration (developer fail-safes)

If the installer cannot register the native messaging manifest automatically (or you are running the native host from source), use the helper scripts in `native_host/helpers/` to install the manifest for your browser profile.

- Windows PowerShell helper:
	- `native_host\helpers\register_native_host_windows.ps1 -HostExePath 'C:\full\path\to\highlightassist-native-host.exe' -ExtensionId '<your-extension-id>'`
- Linux helper:
	- `native_host/helpers/register_native_host_linux.sh /full/path/to/highlightassist-native-host '<your-extension-id>'`
- macOS helper:
	- `native_host/helpers/register_native_host_macos.sh /full/path/to/highlightassist-native-host '<your-extension-id>'`

These scripts use the manifest template `native_host/manifests/com.highlightassist.bridge.json.tpl` and will write manifest files into the per-user NativeMessagingHosts directories for Chrome/Edge. For Firefox, follow the Firefox native messaging docs to install manifests per profile.

Note: the extension ID is required for the manifest's `allowed_origins` entry. You can find it in the extension's `manifest.json` or in `installer-config.iss` where `NativeHostExtensionId` is defined.

## Platform runtime requirements & developer checklist

These notes help developers build and test the native host and service manager locally on each OS.

Windows
- Python 3.8+ (Add to PATH)
- Inno Setup (for building the .exe installer) — `choco install innosetup` on CI or dev machines
- Optional (for notifications): `win10toast` Python package (or rely on `plyer`)

Linux
- Python 3.8+
- libnotify / notify-send available (typically provided by libnotify-bin or desktop environment)
- Optional: `notify2` Python package or `plyer`

macOS
- Python 3.8+
- Optional: `terminal-notifier` (via `brew install terminal-notifier`) or `pync` Python package

Developer checklist (quick)
1. Install Python and dependencies:
	```powershell
	python -m pip install -r requirements.txt
	python -m pip install pyinstaller
	```
2. Build native host (cross-platform PyInstaller bundling of optional tray/notify libs):
	```bash
	# Windows (PowerShell):
	pyinstaller native_host\bridge_host.py --onefile --name highlightassist-native-host --distpath native_host\dist --workpath native_host\build --clean --hidden-import=pystray --hidden-import=PIL --hidden-import=plyer --add-data "assets\\icon-128.png;assets"

	# Linux/macOS (bash):
	pyinstaller native_host/bridge_host.py --onefile --name highlightassist-native-host --distpath native_host/dist --workpath native_host/build --clean --hidden-import=pystray --hidden-import=PIL --hidden-import=plyer --add-data "assets/icon-128.png:assets"
	```
3. Register native messaging manifest (per-browser) using the helper scripts in `native_host/helpers/` or via installer.
4. Run the service manager manually:
	```bash
	# From repo root
	python service-manager.py
	```
5. Open browser and use the extension Projects UI to Start a project. Verify the native host `native_host/native_host_workspaces.json` contains the launched entry. Use Stop to terminate.

If you encounter missing notification libraries, the service will still work — notifications/tray icons are optional fallbacks and the manager will print status to its console/logs.
