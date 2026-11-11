; ========================================================
; Admin Card Printer Agent Inno Setup Script
; Generates Admin-Printer-Agent-Setup.exe
; ========================================================

#define MyAppName "Admin Card Printer Agent"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "MagicCard Technologies"
#define MyAppURL "https://bismaccard.vercel.app"
#define MyAppExeName "KioskAgent.exe"
#define MyServiceName "AdminCardPrinterAgent"

[Setup]
AppId={{E58F91B2-741C-4E83-8B7C-A59B4D9A98F1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\MagicCard\AdminPrintAgent
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputBaseFilename=Admin-Printer-Agent-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Dirs]
Name: "{commonappdata}\MagicCard\AdminPrintAgent"
Name: "{commonappdata}\MagicCard\AdminPrintAgent\logs"

[Files]
Source: "..\apps\kiosk-agent\bin\Release\net9.0-windows\win-x64\publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Start Admin Printer Agent"; Filename: "wscript.exe"; Parameters: """{app}\start_hidden.vbs"""; WorkingDir: "{app}"; IconFilename: "shell32.dll"; IconIndex: 1
Name: "{group}\View Printer Agent Logs"; Filename: "{app}\logs.bat"; IconFilename: "shell32.dll"; IconIndex: 76
Name: "{group}\Stop Printer Agent"; Filename: "{app}\stop.bat"; IconFilename: "shell32.dll"; IconIndex: 27
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{userstartup}\Admin Card Printer Agent"; Filename: "wscript.exe"; Parameters: """{app}\start_hidden.vbs"""; WorkingDir: "{app}"; IconFilename: "shell32.dll"; IconIndex: 1
Name: "{autodesktop}\Admin Card Printer Agent"; Filename: "wscript.exe"; Parameters: """{app}\start_hidden.vbs"""; WorkingDir: "{app}"; IconFilename: "shell32.dll"; IconIndex: 1
Name: "{autodesktop}\Admin Printer Logs"; Filename: "{app}\logs.bat"; IconFilename: "shell32.dll"; IconIndex: 76
Name: "{autodesktop}\Stop Admin Printer"; Filename: "{app}\stop.bat"; IconFilename: "shell32.dll"; IconIndex: 27

[Run]
; Open local Windows Firewall port 7125
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""Admin Card Printer Agent Port 7125"" dir=in action=allow protocol=TCP localport=7125"; Flags: runhidden

; Launch AdminPrintAgent invisibly in background via start_hidden.vbs
Filename: "wscript.exe"; Parameters: """{app}\start_hidden.vbs"""; WorkingDir: "{app}"; Flags: runhidden

[UninstallRun]
Filename: "{app}\stop.bat"; Flags: runhidden
Filename: "cmd.exe"; Parameters: "/c del /f /q ""{userstartup}\Admin Card Printer Agent.lnk"""; Flags: runhidden
Filename: "netsh"; Parameters: "advfirewall firewall delete rule name=""Admin Card Printer Agent Port 7125"""; Flags: runhidden

