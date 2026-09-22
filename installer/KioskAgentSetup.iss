; ========================================================
; EmployeeID KioskAgent Inno Setup Script
; Generates EmployeeID-KioskAgent-Setup.exe
; ========================================================

#define MyAppName "EmployeeID KioskAgent"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "EmployeeID Inc."
#define MyAppURL "https://my-domain.com"
#define MyAppExeName "KioskAgent.exe"
#define MyServiceName "EmployeeIDKioskAgent"

[Setup]
AppId={{D37E84F1-840F-4C82-9B7C-A59B4D9A12E8}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\EmployeeID\KioskAgent
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputBaseFilename=EmployeeID-KioskAgent-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Dirs]
Name: "{commonappdata}\EmployeeID\KioskAgent"
Name: "{commonappdata}\EmployeeID\KioskAgent\logs"

[Files]
; Copy published self-contained binaries from build output directory
Source: "..\apps\kiosk-agent\bin\Release\net9.0-windows\win-x64\publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Start KioskAgent (Invisible Background)"; Filename: "wscript.exe"; Parameters: """{app}\start_hidden.vbs"""; IconFilename: "shell32.dll"; IconIndex: 1
Name: "{group}\Launch Fullscreen Kiosk"; Filename: "{app}\launch_kiosk_fullscreen.bat"; IconFilename: "shell32.dll"; IconIndex: 14
Name: "{group}\View KioskAgent Logs"; Filename: "{app}\logs.bat"; IconFilename: "shell32.dll"; IconIndex: 76
Name: "{group}\Stop KioskAgent"; Filename: "{app}\stop.bat"; IconFilename: "shell32.dll"; IconIndex: 27
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{userstartup}\EmployeeID KioskAgent"; Filename: "wscript.exe"; Parameters: """{app}\start_hidden.vbs"""; WorkingDir: "{app}"; IconFilename: "shell32.dll"; IconIndex: 1
Name: "{autodesktop}\Launch Fullscreen Kiosk"; Filename: "{app}\launch_kiosk_fullscreen.bat"; IconFilename: "shell32.dll"; IconIndex: 14
Name: "{autodesktop}\KioskAgent Logs"; Filename: "{app}\logs.bat"; IconFilename: "shell32.dll"; IconIndex: 76
Name: "{autodesktop}\Stop KioskAgent"; Filename: "{app}\stop.bat"; IconFilename: "shell32.dll"; IconIndex: 27

[Run]
; Open local Windows Firewall port 7125
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""EmployeeID KioskAgent Port 7125"" dir=in action=allow protocol=TCP localport=7125"; Flags: runhidden

; Register Startup auto-run shortcut invisibly
Filename: "wscript.exe"; Parameters: """{app}\install_startup.vbs"""; WorkingDir: "{app}"; Flags: runhidden

; Launch KioskAgent invisibly in background via start_hidden.vbs
Filename: "wscript.exe"; Parameters: """{app}\start_hidden.vbs"""; WorkingDir: "{app}"; Flags: runhidden

[UninstallRun]
; Stop KioskAgent and Watchdog process
Filename: "{app}\stop.bat"; Flags: runhidden

; Delete startup shortcut and firewall rule
Filename: "cmd.exe"; Parameters: "/c del /f /q ""{userstartup}\EmployeeID KioskAgent.lnk"""; Flags: runhidden
Filename: "netsh"; Parameters: "advfirewall firewall delete rule name=""EmployeeID KioskAgent Port 7125"""; Flags: runhidden

[Code]
// Inno Setup Custom Dialog for KIOSK Setup
var
  ConfigPage: TWizardPage;
  KioskIdEdit: TNewEdit;
  BranchIdEdit: TNewEdit;
  ServerUrlEdit: TNewEdit;
  PairingCodeEdit: TNewEdit;

procedure InitializeWizard;
var
  lbl1, lbl2, lbl3, lbl4: TLabel;
begin
  ConfigPage := CreateCustomPage(wpSelectDir, 'KIOSK Device Configuration', 'Configure KIOSK Identity and Server Pairing.');

  lbl1 := TLabel.Create(WizardForm);
  lbl1.Parent := ConfigPage.Surface;
  lbl1.Caption := 'KIOSK ID (e.g. KIOSK-001):';
  lbl1.Left := ScaleX(0);
  lbl1.Top := ScaleY(10);

  KioskIdEdit := TNewEdit.Create(WizardForm);
  KioskIdEdit.Parent := ConfigPage.Surface;
  KioskIdEdit.Left := ScaleX(0);
  KioskIdEdit.Top := ScaleY(30);
  KioskIdEdit.Width := ScaleX(320);
  KioskIdEdit.Text := 'KIOSK-001';

  lbl2 := TLabel.Create(WizardForm);
  lbl2.Parent := ConfigPage.Surface;
  lbl2.Caption := 'Branch ID (e.g. BRANCH-001):';
  lbl2.Left := ScaleX(0);
  lbl2.Top := ScaleY(65);

  BranchIdEdit := TNewEdit.Create(WizardForm);
  BranchIdEdit.Parent := ConfigPage.Surface;
  BranchIdEdit.Left := ScaleX(0);
  BranchIdEdit.Top := ScaleY(85);
  BranchIdEdit.Width := ScaleX(320);
  BranchIdEdit.Text := 'BRANCH-001';

  lbl4 := TLabel.Create(WizardForm);
  lbl4.Parent := ConfigPage.Surface;
  lbl4.Caption := 'Central Server / Backend URL:';
  lbl4.Left := ScaleX(0);
  lbl4.Top := ScaleY(120);

  ServerUrlEdit := TNewEdit.Create(WizardForm);
  ServerUrlEdit.Parent := ConfigPage.Surface;
  ServerUrlEdit.Left := ScaleX(0);
  ServerUrlEdit.Top := ScaleY(140);
  ServerUrlEdit.Width := ScaleX(350);
  ServerUrlEdit.Text := 'https://magic-card-trust-id.vercel.app';

  lbl3 := TLabel.Create(WizardForm);
  lbl3.Parent := ConfigPage.Surface;
  lbl3.Caption := 'HR Admin Pairing Code (Optional at setup):';
  lbl3.Left := ScaleX(0);
  lbl3.Top := ScaleY(175);

  PairingCodeEdit := TNewEdit.Create(WizardForm);
  PairingCodeEdit.Parent := ConfigPage.Surface;
  PairingCodeEdit.Left := ScaleX(0);
  PairingCodeEdit.Top := ScaleY(195);
  PairingCodeEdit.Width := ScaleX(320);
  PairingCodeEdit.Text := '';
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ConfigFilePath: String;
  Content: String;
  TargetUrl: String;
begin
  if CurStep = ssPostInstall then
  begin
    ConfigFilePath := ExpandConstant('{app}\appsettings.json');

    // Only patch KioskId and BranchId into the existing bundled appsettings.json
    // All other settings (SupabaseUrl, Printer, MagicCard, Security) come from the
    // appsettings.json and appsettings.Production.json bundled in the installer.
    if FileExists(ConfigFilePath) then
    begin
      LoadStringFromFile(ConfigFilePath, Content);
      // Replace KioskId value
      StringChangeEx(Content, '"KioskId": "KIOSK-001"', '"KioskId": "' + KioskIdEdit.Text + '"', True);
      // Replace BranchId value
      StringChangeEx(Content, '"BranchId": "BRANCH-001"', '"BranchId": "' + BranchIdEdit.Text + '"', True);
      // Replace ServerUrl if user changed it
      TargetUrl := Trim(ServerUrlEdit.Text);
      if TargetUrl <> '' then
        StringChangeEx(Content, '"SupabaseUrl": "https://magic-card-trust-id.vercel.app"', '"SupabaseUrl": "' + TargetUrl + '"', True);
      SaveStringToFile(ConfigFilePath, Content, False);
    end;
  end;
end;
