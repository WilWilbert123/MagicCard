' ========================================================
' EmployeeID KioskAgent Watchdog Supervision Worker
' Auto-restarts KioskAgent.exe if it crashes or stops unexpectedly.
' Runs invisibly in the background.
' ========================================================
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Dim currentDir, exePath, logFolder, logFile
currentDir = fso.GetAbsolutePathName(".")
exePath = currentDir & "\KioskAgent.exe"
logFolder = currentDir & "\logs"

If Not fso.FolderExists(logFolder) Then
    On Error Resume Next
    fso.CreateFolder(logFolder)
    On Error GoTo 0
End If

logFile = logFolder & "\kiosk_agent_watchdog.log"

Sub LogMsg(msg)
    On Error Resume Next
    Dim ts
    Set ts = fso.OpenTextFile(logFile, 8, True)
    ts.WriteLine "[" & Now & "] " & msg
    ts.Close
    On Error GoTo 0
End Sub

LogMsg "=================================================="
LogMsg "KioskAgent Watchdog Worker Started."
LogMsg "Monitoring: " & exePath
LogMsg "=================================================="

Do While True
    Dim wmi, colProcesses
    Set wmi = GetObject("winmgmts:\\.\root\cimv2")
    Set colProcesses = wmi.ExecQuery("Select * from Win32_Process Where Name = 'KioskAgent.exe'")
    
    If colProcesses.Count = 0 Then
        LogMsg "KioskAgent.exe is NOT running! Restarting invisibly..."
        
        If fso.FileExists(exePath) Then
            ' Launch KioskAgent.exe invisibly with window style 0
            WshShell.Run """" & exePath & """", 0, False
            LogMsg "KioskAgent.exe process spawned."
            WScript.Sleep 5000 ' Wait 5 seconds after launching to avoid rapid loops
        Else
            LogMsg "ERROR: Could not locate KioskAgent.exe at " & exePath
            WScript.Sleep 10000
        End If
    Else
        ' KioskAgent.exe is healthy and running
        WScript.Sleep 3000 ' Polling interval: 3 seconds
    End If
Loop
