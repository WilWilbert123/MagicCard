' ========================================================
' EmployeeID KioskAgent Invisible Background Service Launcher
' 1-Click Setup & Launch Script:
' - Configures Windows Startup (shell:startup)
' - Invisibly launches Watchdog background service (no popup window)
' ========================================================
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Dim currentDir, startupFolder, shortcutPath
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = currentDir

' 1. Auto-configure Windows Startup shortcut (shell:startup)
On Error Resume Next
startupFolder = WshShell.SpecialFolders("Startup")
shortcutPath = startupFolder & "\EmployeeID_KioskAgent.lnk"

Set oShortcut = WshShell.CreateShortcut(shortcutPath)
oShortcut.TargetPath = "wscript.exe"
oShortcut.Arguments = """" & currentDir & "\start_hidden.vbs"""
oShortcut.WorkingDirectory = currentDir
oShortcut.Description = "EmployeeID KioskAgent Invisible Background Service"
oShortcut.WindowStyle = 7
oShortcut.IconLocation = "shell32.dll,1"
oShortcut.Save
On Error GoTo 0

' 2. Launch Watchdog VBS silently with Window Style 0 (Hidden)
WshShell.Run "wscript.exe """ & currentDir & "\watchdog.vbs""", 0, False
