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
