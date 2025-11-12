# Developer Guide — Native Host & Service Manager

This guide describes manual developer steps to register and test the native messaging host and the service manager locally across platforms.

## Prereqs
- Python 3.8+
- `pip` available
- Optional: `pystray`, `Pillow`, `plyer` for tray/notifications

## Build the native host (PyInstaller)

Windows (PowerShell):

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller
pyinstaller native_host\bridge_host.py --onefile --name highlightassist-native-host --distpath native_host\dist --workpath native_host\build --clean --hidden-import=pystray --hidden-import=PIL --hidden-import=plyer --add-data "assets\\icon-128.png;assets"
```

Linux/macOS (bash):

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller
pyinstaller native_host/bridge_host.py --onefile --name highlightassist-native-host --distpath native_host/dist --workpath native_host/build --clean --hidden-import=pystray --hidden-import=PIL --hidden-import=plyer --add-data "assets/icon-128.png:assets"
```

## Register native host manifest (developer only)

Use the helper scripts supplied in `native_host/helpers/`.

Windows (PowerShell):

```powershell
# Example (adjust paths and extension id):
.
\native_host\helpers\register_native_host_windows.ps1 -HostExePath 'C:\full\path\to\native_host\dist\highlightassist-native-host.exe' -ExtensionId '<your-extension-id>'
```

Linux (bash):

```bash
native_host/helpers/register_native_host_linux.sh /full/path/to/highlightassist-native-host '<your-extension-id>'
```

macOS (bash):

```bash
native_host/helpers/register_native_host_macos.sh /full/path/to/highlightassist-native-host '<your-extension-id>'
```

## Run service manager

From the repository root:

```bash
python service-manager.py
```

The manager listens on TCP 127.0.0.1:5054 and can start/stop the bridge (which serves on 5055).

## Quick test flow

1. Start `service-manager.py`.
2. Start the extension overlay and open the Bridge tab. Click the Projects "Add Project" and register a small command (e.g., `python -m http.server 3000` or your project's `npm run dev`).
3. Click ▶ Start — confirm the native host returns `status: started` and `native_host/native_host_workspaces.json` contains an entry.
4. Click ■ Stop — confirm the process is terminated and the entry removed from `native_host/native_host_workspaces.json`.

## Troubleshooting
- If notifications don't appear, ensure optional packages are installed (`pip install win10toast notify2 pync plyer`). The manager will still function without them.
- If native host cannot be launched, check that `bridge.py` and `service-manager.py` are present and that Python path is correct.

## Tests
Run the simple pytest included in `tests/test_bridge_host.py`:

```bash
pip install pytest
pytest -q tests/test_bridge_host.py
```

This will attempt to start a short-lived Python sleeper process using `bridge_host` helper functions and then kill it.
