@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

title Trinh dang bai - Cam nang An toan so

rem Cau hinh toi uu anh: nen ngay khi chon, giu canh dai 1920 px va
rem tu chon chat luong JPEG tot nhat trong muc tieu khoang 1,25 MB/anh.
set "PUBLISHER_IMAGE_MAX_EDGE=1920"
set "PUBLISHER_IMAGE_TARGET_BYTES=1250000"
set "PUBLISHER_IMAGE_MAX_BYTES=2500000"
set "PUBLISHER_IMAGE_MIN_QUALITY=0.74"
set "PUBLISHER_IMAGE_MAX_QUALITY=0.92"
set "PUBLISHER_IMAGE_MAX_SOURCE_BYTES=262144000"

where node >nul 2>nul
if errorlevel 1 (
  echo Khong tim thay Node.js. Hay cai Node.js 24 roi thu lai.
  echo.
  pause
  exit /b 1
)

echo Dang khoi dong giao dien dang bai...
echo Anh se tu dong giam dung luong ngay khi dinh kem, van uu tien do net.
echo Trinh duyet se tu mo. Khong dong cua so nay khi dang su dung.
echo.
node scripts\publisher-server.js

echo.
echo Trinh dang bai da dung.
pause
endlocal
