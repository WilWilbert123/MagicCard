' ========================================================
' EmployeeID KioskAgent Watchdog Supervision Worker
' Auto-restarts KioskAgent.exe if it crashes or stops unexpectedly.
' Runs invisibly in the background.
' ========================================================
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Dim currentDir, exePath, logFolder, logFile
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
logFolder = currentDir & "\logs"

' Locate KioskAgent.exe (Installed location or Development publish location)
If fso.FileExists(currentDir & "\KioskAgent.exe") Then
    exePath = currentDir & "\KioskAgent.exe"
ElseIf fso.FileExists(currentDir & "\bin\Release\net9.0-windows\win-x64\publish\KioskAgent.exe") Then
    exePath = currentDir & "\bin\Release\net9.0-windows\win-x64\publish\KioskAgent.exe"
ElseIf fso.FileExists(currentDir & "\bin\Debug\net9.0-windows\win-x64\KioskAgent.exe") Then
    exePath = currentDir & "\bin\Debug\net9.0-windows\win-x64\KioskAgent.exe"
Else
    exePath = currentDir & "\KioskAgent.exe"
End If

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

Dim wmi
Set wmi = GetObject("winmgmts:\\.\root\cimv2")

Do While True
    Dim colProcesses
    Set colProcesses = wmi.ExecQuery("Select * from Win32_Process Where Name = 'KioskAgent.exe'")
    
    If colProcesses.Count = 0 Then
        LogMsg "KioskAgent.exe is NOT running! Restarting invisibly..."
        
        If fso.FileExists(exePath) Then
            Dim exeDir
            exeDir = fso.GetParentFolderName(exePath)
            WshShell.CurrentDirectory = exeDir
            
            WshShell.Run """" & exePath & """", 0, False
            LogMsg "KioskAgent.exe process spawned at " & exePath
            WScript.Sleep 5000 ' Wait 5 seconds after launching to avoid rapid loops
        Else
            LogMsg "ERROR: Could not locate KioskAgent.exe at " & exePath
            WScript.Sleep 10000
        End If
    Else
        WScript.Sleep 5000 ' Polling interval: 5 seconds
    End If
Loop
