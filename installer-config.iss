; HighlightAssist Windows Installer Script
; Inno Setup Configuration File
; https://jrsoftware.org/isinfo.php

#define MyAppName "HighlightAssist"
#define MyAppVersion "2.0.0"
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
; Installation settings
DefaultDirName={autopf}\HighlightAssist
DisableDirPage=auto
DefaultGroupName=HighlightAssist
DisableProgramGroupPage=yes
AllowNoIcons=yes
LicenseFile=LICENSE
InfoBeforeFile=installer-assets\INFO_BEFORE.txt
; Professional installer settings
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
CloseApplications=yes
RestartApplications=no
; Output settings
OutputDir=installers
OutputBaseFilename=HighlightAssist-Setup-v{#MyAppVersion}
#if FileExists('icons\\icon128.ico')
UninstallDisplayIcon={app}\icons\icon128.ico
#else
UninstallDisplayIcon={uninstallexe}
#endif
#if FileExists('icons\\icon128.ico')
SetupIconFile=icons\\icon128.ico
#endif
; Compression
Compression=lzma2/max
SolidCompression=yes
; Wizard appearance
WizardStyle=modern
WizardResizable=yes
WizardSizePercent=110
WizardImageStretch=yes
WizardImageAlphaFormat=premultiplied
WizardImageBackColor=clWhite
WizardSmallImageBackColor=clWhite
#if FileExists('installer-wizard-image.bmp')
WizardImageFile=installer-wizard-image.bmp
#endif
#if FileExists('installer-wizard-small.bmp')
WizardSmallImageFile=installer-wizard-small.bmp
#endif
; Uninstall settings
UninstallDisplayName={#MyAppName} {#MyAppVersion}
UninstallFilesDir={app}\uninst
CreateUninstallRegKey=yes
; Version information
VersionInfoVersion={#MyAppVersion}
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription=HighlightAssist - Visual UI Debugger with Localhost Management
VersionInfoCopyright=© {#MyAppPublisher} 2025
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "autostart"; Description: "Start automatically when Windows starts (tray icon)"; GroupDescription: "Service Options:"; Flags: checked
Name: "openlogsfolder"; Description: "Open logs folder after installation (for developers)"; GroupDescription: "Developer Options:"; Flags: unchecked

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
Source: "core\health_server.py"; DestDir: "{app}\core"; Flags: ignoreversion
Source: "core\bridge_monitor.py"; DestDir: "{app}\core"; Flags: ignoreversion
; Requirements and docs
Source: "requirements.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion isreadme
; Icons
Source: "icons\icon128.png"; DestDir: "{app}\icons"; Flags: ignoreversion
Source: "assets\icon-128.png"; DestDir: "{app}\assets"; Flags: ignoreversion

[Icons]
; Start Menu shortcuts
Name: "{group}\HighlightAssist"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Comment: "Start HighlightAssist Service Manager with Tray Icon"
Name: "{group}\View Logs"; Filename: "{win}\explorer.exe"; Parameters: """{localappdata}\HighlightAssist\logs"""; Comment: "Open log directory"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"; Comment: "Uninstall HighlightAssist"
; Desktop icon (optional task)
Name: "{autodesktop}\HighlightAssist"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon; Comment: "HighlightAssist - Visual UI Debugger"
; Auto-start shortcut (optional task)
Name: "{userstartup}\HighlightAssist"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: autostart; Comment: "HighlightAssist Service Manager"

[Run]
; Post-install: Create log directory
Filename: "{cmd}"; Parameters: "/c mkdir ""{localappdata}\HighlightAssist\logs"""; Flags: runhidden waituntilterminated
; Launch daemon with tray icon (non-blocking)
Filename: "{app}\{#MyAppExeName}"; Description: "Launch HighlightAssist now (tray icon will appear)"; Flags: nowait postinstall skipifsilent; WorkingDir: "{app}"
; Developer option: Open logs folder
Filename: "{win}\explorer.exe"; Parameters: """{localappdata}\HighlightAssist\logs"""; Description: "Open logs folder (recommended for developers)"; Flags: postinstall skipifsilent unchecked shellexec

[Code]
var
  IsUpgrade: Boolean;
  IsSilentUpgrade: Boolean;

function InitializeSetup(): Boolean;
var
  UninstallKey: String;
  InstalledVersion: String;
  CurrentVersion: String;
begin
  Result := True;
  IsUpgrade := False;
  IsSilentUpgrade := False;
  CurrentVersion := '{#MyAppVersion}';
  
  // Check if already installed
  UninstallKey := 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{{E8F9A2B1-4C3D-5E6F-7A8B-9C0D1E2F3A4B}_is1';
  
  if RegQueryStringValue(HKCU, UninstallKey, 'DisplayVersion', InstalledVersion) then
  begin
    IsUpgrade := True;
    
    // Compare versions
    if InstalledVersion = CurrentVersion then
    begin
      // Same version - offer repair
      if MsgBox('HighlightAssist ' + InstalledVersion + ' is already installed.' + #13#13 + 
                'Do you want to repair this installation?', 
                mbConfirmation, MB_YESNO) = IDYES then
      begin
        Result := True;
      end
      else
      begin
        Result := False;
      end;
    end
    else
    begin
      // Different version - offer upgrade
      if MsgBox('HighlightAssist ' + InstalledVersion + ' is currently installed.' + #13#13 + 
                'Do you want to upgrade to version ' + CurrentVersion + '?', 
                mbConfirmation, MB_YESNO) = IDYES then
      begin
        Result := True;
      end
      else
      begin
        Result := False;
      end;
    end;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
begin
  if CurStep = ssInstall then
  begin
    if IsUpgrade then
    begin
      // Stop running daemon before upgrade
      Exec('cmd.exe', '/c taskkill /F /IM "{#MyAppExeName}"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    end;
  end;
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
  
  // Skip directory page on upgrades (use existing directory)
  if IsUpgrade and (PageID = wpSelectDir) then
    Result := True;
    
  // Skip ready page if silent upgrade
  if IsSilentUpgrade and (PageID = wpReady) then
    Result := True;
end;

[Registry]
; Auto-start with Windows (if task selected)
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "HighlightAssist"; ValueData: """{app}\{#MyAppExeName}"""; Tasks: autostart

[UninstallRun]
; Stop the daemon before uninstalling
Filename: "{cmd}"; Parameters: "/c taskkill /F /IM ""{#MyAppExeName}"""; Flags: runhidden; RunOnceId: "StopDaemon"

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
; Clean up logs folder
Type: filesandordirs; Name: "{localappdata}\HighlightAssist"

