@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo === Chay thu website tuyen truyen An ninh mang ===
echo.
echo Dang tao ban website public trong thu muc dist...
node scripts\build-public.js
if errorlevel 1 (
  echo.
  echo Loi khi cap nhat du lieu. Kiem tra da cai Node.js chua.
  pause
  exit /b 1
)

echo Dang khoi dong server tai http://localhost:8990 ...
start "TUYEN_TRUYEN - server (dong cua so nay de tat)" cmd /k python -m http.server 8990 --directory dist

timeout /t 1 /nobreak >nul
start "" http://localhost:8990

endlocal
