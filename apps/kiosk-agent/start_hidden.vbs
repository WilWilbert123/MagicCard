' ========================================================
' EmployeeID KioskAgent Invisible Launcher
' Runs KioskAgent Watchdog completely silently (hidden mode 0)
' No CMD or Console window will pop up.
' ========================================================
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Dim currentDir
currentDir = fso.GetAbsolutePathName(".")

' Launch Watchdog VBS silently using WScript with Window Style 0 (Hidden)
WshShell.Run "wscript.exe """ & currentDir & "\watchdog.vbs""", 0, False
