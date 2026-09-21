@echo off
title Launch Kiosk Fullscreen Mode
echo ==================================================
echo   Launching MagicCard Kiosk in Fullscreen Mode
echo ==================================================
echo.

:: Check if Microsoft Edge exists
set EDGE_PATH="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not exist %EDGE_PATH% (
    set EDGE_PATH="C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

if exist %EDGE_PATH% (
    echo Starting Microsoft Edge Kiosk Mode...
    start "" %EDGE_PATH% --kiosk http://localhost:3000/kiosk --edge-kiosk-type=fullscreen --no-first-run --disable-pinch
    echo Done! Press F11 in Edge at any time to toggle fullscreen.
) else (
    echo Opening default browser...
    start http://localhost:3000/kiosk
)
