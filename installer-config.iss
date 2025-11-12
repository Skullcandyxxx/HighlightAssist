; HighlightAssist Windows Installer Script
; Inno Setup Configuration File
; https://jrsoftware.org/isinfo.php

#define MyAppName "HighlightAssist Bridge"
#define MyAppVersion "3.4.0"
#define MyAppPublisher "Skullcandyxxx"
#define MyAppURL "https://github.com/Skullcandyxxx/HighlightAssist"
#define MyAppExeName "service_manager_v2.py"

[Setup]
; NOTE: The value of AppId uniquely identifies this application.
AppId={{E8F9A2B1-4C3D-5E6F-7A8B-9C0D1E2F3A4B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=Skullcandyxxx
AppPublisherURL=https://github.com/Skullcandyxxx/HighlightAssist
AppSupportURL=https://github.com/Skullcandyxxx/HighlightAssist/issues
AppUpdatesURL=https://github.com/Skullcandyxxx/HighlightAssist/releases
AppContact=skullcandyxxx@github.com
AppCopyright=© {#MyAppPublisher} {#MyAppVersion}
DefaultDirName={userappdata}\HighlightAssist
DefaultGroupName=HighlightAssist
DisableProgramGroupPage=yes
LicenseFile=LICENSE
InfoBeforeFile=installer-assets\INFO_BEFORE.txt
InfoAfterFile=installer-assets\INFO_AFTER.txt
; Uncomment the following line to run in non administrative install mode (install for current user only.)
PrivilegesRequired=lowest
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
Source: "bridge.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "service_manager_v2.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "core\__init__.py"; DestDir: "{app}\core"; Flags: ignoreversion
Source: "core\bridge_controller.py"; DestDir: "{app}\core"; Flags: ignoreversion
Source: "core\tcp_server.py"; DestDir: "{app}\core"; Flags: ignoreversion
Source: "core\notifier.py"; DestDir: "{app}\core"; Flags: ignoreversion
Source: "requirements.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion isreadme
Source: "icons\icon128.png"; DestDir: "{app}\icons"; Flags: ignoreversion
#if FileExists('icons\\icon128.ico')
Source: "icons\\icon128.ico"; DestDir: "{app}\\icons"; Flags: ignoreversion
#endif
Source: "native_host\dist\highlightassist-native-host.exe"; DestDir: "{app}\native_host"; Flags: ignoreversion
Source: "native_host\manifests\com.highlightassist.bridge.json.tpl"; DestDir: "{app}\native_host\manifests"; Flags: ignoreversion
Source: "dist\HighlightAssist-Service-Manager.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\HighlightAssist Bridge"; Filename: "{cmd}"; Parameters: "/c start /min pythonw ""{app}\service_manager_v2.py"""; WorkingDir: "{app}"; IconFilename: "{app}\icons\icon-128.png"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\HighlightAssist Bridge"; Filename: "{cmd}"; Parameters: "/c start /min pythonw ""{app}\service_manager_v2.py"""; WorkingDir: "{app}"; IconFilename: "{app}\icons\icon-128.png"; Tasks: desktopicon
Name: "{group}\HighlightAssist Service Manager"; Filename: "{app}\HighlightAssist-Service-Manager.exe"

[Run]
; Install Python dependencies
Filename: "{cmd}"; Parameters: "/c python -m pip install --upgrade pip"; StatusMsg: "Updating pip..."; Flags: runhidden
Filename: "{cmd}"; Parameters: "/c python -m pip install -r ""{app}\requirements.txt"""; StatusMsg: "Installing Python dependencies..."; Flags: runhidden
; Start the service
Filename: "{cmd}"; Parameters: "/c start /min pythonw ""{app}\service_manager_v2.py"""; WorkingDir: "{app}"; Description: "Start HighlightAssist Bridge now"; Flags: nowait postinstall skipifsilent

[Registry]
; Auto-start registry entry
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "HighlightAssistBridge"; ValueData: "pythonw ""{app}\service_manager_v2.py"""; Tasks: autostart

[Code]
const
  NativeHostExtensionId = 'eoeeldombophiplndcfomgnfklmnkdce';

function EscapeForJson(Value: string): string;
begin
  Result := Value;
  StringChangeEx(Result, '\', '\\', True);
end;

procedure RegisterNativeMessagingHosts;
var
  TemplatePath, TemplateContent, HostPath, ChromeManifest, EdgeManifest: string;
begin
  TemplatePath := ExpandConstant('{app}\native_host\manifests\com.highlightassist.bridge.json.tpl');
  if not LoadStringFromFile(TemplatePath, TemplateContent) then
  begin
    exit;
  end;

  HostPath := EscapeForJson(ExpandConstant('{app}\native_host\highlightassist-native-host.exe'));
  StringChangeEx(TemplateContent, '{{HOST_PATH}}', HostPath, True);
  StringChangeEx(TemplateContent, '{{EXTENSION_ID}}', NativeHostExtensionId, True);

  ChromeManifest := ExpandConstant('{localappdata}\Google\Chrome\User Data\NativeMessagingHosts\com.highlightassist.bridge.json');
  ForceDirectories(ExtractFileDir(ChromeManifest));
  SaveStringToFile(ChromeManifest, TemplateContent, False);

  EdgeManifest := ExpandConstant('{localappdata}\Microsoft\Edge\User Data\NativeMessagingHosts\com.highlightassist.bridge.json');
  ForceDirectories(ExtractFileDir(EdgeManifest));
  SaveStringToFile(EdgeManifest, TemplateContent, False);
end;

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
begin
  if CurStep = ssPostInstall then
  begin
    // Create startup shortcut
    if WizardIsTaskSelected('autostart') then
    begin
      // Already handled by Registry section
    end;
    RegisterNativeMessagingHosts;
  end;
end;

[UninstallRun]
; Stop the service before uninstalling
Filename: "{cmd}"; Parameters: "/c taskkill /F /IM pythonw.exe /FI ""WINDOWTITLE eq service-manager.py*"""; Flags: runhidden; RunOnceId: "StopService"
Filename: "{cmd}"; Parameters: "/c del ""{localappdata}\Google\Chrome\User Data\NativeMessagingHosts\com.highlightassist.bridge.json"""; Flags: runhidden ignoreerrors
Filename: "{cmd}"; Parameters: "/c del ""{localappdata}\Microsoft\Edge\User Data\NativeMessagingHosts\com.highlightassist.bridge.json"""; Flags: runhidden ignoreerrors

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
