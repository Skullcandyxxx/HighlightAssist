; HighlightAssist Windows Installer Script
; Inno Setup Configuration File
; https://jrsoftware.org/isinfo.php

#define MyAppName "HighlightAssist Bridge"
#define MyAppVersion "3.4.0"
#define MyAppPublisher "Skullcandyxxx"
#define MyAppURL "https://github.com/Skullcandyxxx/HighlightAssist"
#define MyAppExeName "service-manager.py"

[Setup]
; NOTE: The value of AppId uniquely identifies this application.
AppId={{E8F9A2B1-4C3D-5E6F-7A8B-9C0D1E2F3A4B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}/issues
AppUpdatesURL={#MyAppURL}/releases
DefaultDirName={userappdata}\HighlightAssist
DefaultGroupName=HighlightAssist
DisableProgramGroupPage=yes
LicenseFile=LICENSE
; Uncomment the following line to run in non administrative install mode (install for current user only.)
PrivilegesRequired=lowest
OutputDir=installers
OutputBaseFilename=HighlightAssist-Setup-v{#MyAppVersion}
SetupIconFile=icons\icon128.png
Compression=lzma
SolidCompression=yes
WizardStyle=modern
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
Name: "autostart"; Description: "Start HighlightAssist Bridge automatically when Windows starts"; GroupDescription: "Additional options:"; Flags: checked

[Files]
Source: "bridge.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "service-manager.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "requirements.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion isreadme
Source: "icons\icon128.png"; DestDir: "{app}\icons"; Flags: ignoreversion

[Icons]
Name: "{group}\HighlightAssist Bridge"; Filename: "{cmd}"; Parameters: "/c start /min pythonw ""{app}\service-manager.py"""; WorkingDir: "{app}"; IconFilename: "{app}\icons\icon-128.png"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\HighlightAssist Bridge"; Filename: "{cmd}"; Parameters: "/c start /min pythonw ""{app}\service-manager.py"""; WorkingDir: "{app}"; IconFilename: "{app}\icons\icon-128.png"; Tasks: desktopicon

[Run]
; Install Python dependencies
Filename: "{cmd}"; Parameters: "/c python -m pip install --upgrade pip"; StatusMsg: "Updating pip..."; Flags: runhidden
Filename: "{cmd}"; Parameters: "/c python -m pip install -r ""{app}\requirements.txt"""; StatusMsg: "Installing Python dependencies..."; Flags: runhidden
; Start the service
Filename: "{cmd}"; Parameters: "/c start /min pythonw ""{app}\service-manager.py"""; WorkingDir: "{app}"; Description: "Start HighlightAssist Bridge now"; Flags: nowait postinstall skipifsilent

[Registry]
; Auto-start registry entry
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "HighlightAssistBridge"; ValueData: "pythonw ""{app}\service-manager.py"""; Tasks: autostart

[Code]
function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
begin
  // Check if Python is installed
  if Exec('cmd.exe', '/c python --version', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    if ResultCode = 0 then
    begin
      Result := True;
    end
    else
    begin
      MsgBox('Python is not installed or not in PATH.' + #13#10 + #13#10 + 
             'Please install Python 3.8 or higher from:' + #13#10 + 
             'https://www.python.org/downloads/' + #13#10 + #13#10 + 
             'Make sure to check "Add Python to PATH" during installation.', 
             mbError, MB_OK);
      Result := False;
    end;
  end
  else
  begin
    MsgBox('Could not check for Python installation.' + #13#10 + 
           'Please ensure Python 3.8+ is installed.', 
           mbInformation, MB_OK);
    Result := True; // Continue anyway
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
begin
  if CurStep = ssPostInstall then
  begin
    // Create startup shortcut
    if IsTaskSelected('autostart') then
    begin
      // Already handled by Registry section
    end;
  end;
end;

[UninstallRun]
; Stop the service before uninstalling
Filename: "{cmd}"; Parameters: "/c taskkill /F /IM pythonw.exe /FI ""WINDOWTITLE eq service-manager.py*"""; Flags: runhidden

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
