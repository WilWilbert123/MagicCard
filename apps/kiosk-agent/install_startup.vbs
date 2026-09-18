' ========================================================
' EmployeeID KioskAgent Startup Installer
' Registers start_hidden.vbs into Windows Startup (shell:startup)
' Ensures KioskAgent runs invisibly whenever the PC/KIOSK boots up.
' ========================================================
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Dim currentDir, startupFolder, shortcutPath, targetPath
currentDir = fso.GetAbsolutePathName(".")
startupFolder = WshShell.SpecialFolders("Startup")
shortcutPath = startupFolder & "\EmployeeID_KioskAgent.lnk"
targetPath = currentDir & "\start_hidden.vbs"

If Not fso.FileExists(targetPath) Then
    WScript.Echo "ERROR: Cannot find " & targetPath
    WScript.Quit 1
End If

Set oShortcut = WshShell.CreateShortcut(shortcutPath)
oShortcut.TargetPath = "wscript.exe"
oShortcut.Arguments = """" & targetPath & """"
oShortcut.WorkingDirectory = currentDir
oShortcut.Description = "EmployeeID KioskAgent Invisible Background Worker"
oShortcut.WindowStyle = 7 ' Minimized
oShortcut.IconLocation = "shell32.dll,1"
oShortcut.Save

WScript.Echo "==================================================" & vbCrLf & _
             "SUCCESS: KioskAgent Auto-Startup Installed!" & vbCrLf & _
             "Shortcut Path: " & shortcutPath & vbCrLf & _
             "Target: " & targetPath & vbCrLf & _
             "KioskAgent will now run invisibly whenever Windows boots." & vbCrLf & _
             "=================================================="
