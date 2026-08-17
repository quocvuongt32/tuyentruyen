@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

node scripts\add-event.js

echo.
pause
endlocal
