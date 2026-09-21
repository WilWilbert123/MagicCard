' ========================================================
' EmployeeID KioskAgent - Master Auto-Start & Installer Launcher
' 1-Click Setup: Automatically configures Windows Startup and launches
' KioskAgent in the background silently.
' ========================================================
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Dim currentDir, startupFolder, shortcutPath, targetPath
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = currentDir

' 1. Install Windows Auto-Run Shortcut in Startup folder
startupFolder = WshShell.SpecialFolders("Startup")
shortcutPath = startupFolder & "\EmployeeID_KioskAgent.lnk"

Set oShortcut = WshShell.CreateShortcut(shortcutPath)
oShortcut.TargetPath = "wscript.exe"
oShortcut.Arguments = """" & currentDir & "\AutoStart_Hidden.vbs"""
oShortcut.WorkingDirectory = currentDir
oShortcut.Description = "EmployeeID KioskAgent Invisible Background Service"
oShortcut.WindowStyle = 7 ' Minimized
oShortcut.IconLocation = "shell32.dll,1"
oShortcut.Save

' 2. Launch KioskAgent (via PM2 if installed, or via Watchdog VBS)
Dim pm2Check
pm2Check = WshShell.Run("cmd.exe /c where pm2", 0, True)

If pm2Check = 0 Then
    ' PM2 is installed - use PM2 for process supervision
    WshShell.Run "cmd.exe /c pm2 start ecosystem.config.js", 0, True
    WshShell.Run "cmd.exe /c pm2 save", 0, True
Else
    ' Standalone VBS Watchdog process supervision
    WshShell.Run "wscript.exe """ & currentDir & "\watchdog.vbs""", 0, False
End If

' 3. Display Confirmation Toast/Popup
WshShell.Popup "EmployeeID KioskAgent is now active and running in the background!" & vbCrLf & vbCrLf & _
              "- Auto-start on reboot: ACTIVATED" & vbCrLf & _
              "- Real-time supervision: ACTIVE" & vbCrLf & _
              "- Double-click 'logs.bat' to view live system logs" & vbCrLf & _
              "- Double-click 'stop.bat' to stop the agent", 5, "EmployeeID KioskAgent", 64
