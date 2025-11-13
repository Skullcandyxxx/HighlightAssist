; HighlightAssist Windows Installer Script
; Inno Setup Configuration File
; https://jrsoftware.org/isinfo.php

#define MyAppName "HighlightAssist Daemon"
#define MyAppVersion "1.2.2"
#define MyAppPublisher "Skullcandyxxx"
#define MyAppURL "https://github.com/Skullcandyxxx/HighlightAssist"
#define MyAppExeName "HighlightAssist-Service-Manager.exe"

[Setup]
; NOTE: The value of AppId uniquely identifies this application.
AppId={{E8F9A2B1-4C3D-5E6F-7A8B-9C0D1E2F3A4B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL=https://github.com/Skullcandyxxx/HighlightAssist/issues
AppUpdatesURL=https://github.com/Skullcandyxxx/HighlightAssist/releases
AppContact=skullcandyxxx@github.com
AppCopyright=© {#MyAppPublisher} 2025
; Allow user to choose installation directory
DefaultDirName={autopf}\HighlightAssist
; Show directory selection page
DisableDirPage=no
DefaultGroupName=HighlightAssist
DisableProgramGroupPage=yes
LicenseFile=LICENSE
InfoBeforeFile=installer-assets\INFO_BEFORE.txt
InfoAfterFile=installer-assets\INFO_AFTER.txt
; No admin required - installs for current user
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=installers
OutputBaseFilename=HighlightAssist-Setup-v{#MyAppVersion}
#if FileExists('icons\\icon128.ico')
UninstallDisplayIcon={app}\icons\icon128.ico
#else
UninstallDisplayIcon={uninstallexe}
#endif
// Use ICO file for Setup icon if available (ISCC requires .ico). Fall back to no icon when missing.
#if FileExists('icons\\icon128.ico')
SetupIconFile=icons\\icon128.ico
#endif
Compression=lzma
SolidCompression=yes
WizardStyle=modern
WizardResizable=yes
WizardSizePercent=110
WizardImageStretch=yes
WizardImageAlphaFormat=premultiplied
WizardImageBackColor=clWhite
WizardSmallImageBackColor=clWhite
// Wizard images are optional in CI; only set them if the files exist
#if FileExists('installer-wizard-image.bmp')
WizardImageFile=installer-wizard-image.bmp
#endif
#if FileExists('installer-wizard-small.bmp')
WizardSmallImageFile=installer-wizard-small.bmp
#endif

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "autostart"; Description: "Start HighlightAssist Bridge automatically when Windows starts"; GroupDescription: "Additional options:"

[Files]
; Main executable (PyInstaller built)
Source: "dist\HighlightAssist-Service-Manager.exe"; DestDir: "{app}"; Flags: ignoreversion
; Python scripts (for reference/debugging)
Source: "bridge.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "service_manager_v2.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "tray_icon.py"; DestDir: "{app}"; Flags: ignoreversion
; Core modules
Source: "core\__init__.py"; DestDir: "{app}\core"; Flags: ignoreversion
Source: "core\bridge_controller.py"; DestDir: "{app}\core"; Flags: ignoreversion
Source: "core\tcp_server.py"; DestDir: "{app}\core"; Flags: ignoreversion
Source: "core\notifier.py"; DestDir: "{app}\core"; Flags: ignoreversion
; Requirements and docs
Source: "requirements.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion isreadme
; Icons
Source: "icons\icon128.png"; DestDir: "{app}\icons"; Flags: ignoreversion
Source: "assets\icon-128.png"; DestDir: "{app}\assets"; Flags: ignoreversion

[Icons]
; Start Menu shortcuts
Name: "{group}\HighlightAssist Daemon"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Comment: "Start HighlightAssist Daemon"
Name: "{group}\Stop HighlightAssist"; Filename: "{cmd}"; Parameters: "/c taskkill /F /IM ""{#MyAppExeName}"""; Comment: "Stop the daemon"; IconFilename: "{app}\icons\icon128.png"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
; Desktop icon (optional task)
Name: "{autodesktop}\HighlightAssist"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon; Comment: "HighlightAssist Daemon"

[Run]
; Check if Python is available and install dependencies
Filename: "{cmd}"; Parameters: "/c python -m pip install --upgrade pip"; StatusMsg: "Updating pip (optional - skipped if Python not found)..."; Flags: runhidden skipifdoesntexist
Filename: "{cmd}"; Parameters: "/c python -m pip install -r ""{app}\requirements.txt"""; StatusMsg: "Installing Python dependencies (optional)..."; Flags: runhidden skipifdoesntexist
; Start the daemon after installation
Filename: "{app}\{#MyAppExeName}"; Description: "Launch HighlightAssist Daemon now"; Flags: nowait postinstall skipifsilent; WorkingDir: "{app}"

[Registry]
; Auto-start with Windows (if task selected)
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "HighlightAssistDaemon"; ValueData: """{app}\{#MyAppExeName}"""; Tasks: autostart

[UninstallRun]
; Stop the daemon before uninstalling
Filename: "{cmd}"; Parameters: "/c taskkill /F /IM ""{#MyAppExeName}"""; Flags: runhidden; RunOnceId: "StopDaemon"

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
; Clean up logs folder
Type: filesandordirs; Name: "{localappdata}\HighlightAssist"

