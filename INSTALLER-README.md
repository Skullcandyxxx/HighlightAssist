# Building the Windows Installer

## Quick Start

### Using GitHub Actions (Recommended)
Push a tag to automatically build and release:
```bash
git tag -a v3.4.0 -m "Release v3.4.0"
git push origin v3.4.0
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

The installer will be created in `installers/HighlightAssist-Setup-v3.4.0.exe`

## Installer Features

✅ **Professional Windows Installer (.exe)**
- Modern wizard interface with branding
- Python dependency check before installation
- Automatic pip dependency installation
- Start Menu shortcuts
- Desktop icon (optional)
- Auto-start on Windows boot (optional)
- Proper uninstall via Windows Control Panel

✅ **License Display**
- Shows MIT license during installation
- Users must accept before proceeding

✅ **Silent Installation Support**
```cmd
HighlightAssist-Setup-v3.4.0.exe /SILENT
HighlightAssist-Setup-v3.4.0.exe /VERYSILENT /TASKS="autostart"
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
