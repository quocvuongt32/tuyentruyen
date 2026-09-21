@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

title Trinh dang bai - Cam nang An toan so

where node >nul 2>nul
if errorlevel 1 (
  echo Khong tim thay Node.js. Hay cai Node.js 24 roi thu lai.
  echo.
  pause
  exit /b 1
)

echo Dang khoi dong giao dien dang bai...
echo Trinh duyet se tu mo. Khong dong cua so nay khi dang su dung.
echo.
node scripts\publisher-server.js

echo.
echo Trinh dang bai da dung.
pause
endlocal
