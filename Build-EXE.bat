@echo off
echo Building SmartNotes.exe (needs internet once, to install the ps2exe module)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Install-Module ps2exe -Scope CurrentUser -Force; Invoke-ps2exe -inputFile '%~dp0SmartNotes.ps1' -outputFile '%~dp0SmartNotes.exe' -noConsole -iconFile '%~dp0icons\app.ico' -title 'Smart Notes'"
echo.
echo Done. Keep SmartNotes.exe in the same folder as index.html.
pause
