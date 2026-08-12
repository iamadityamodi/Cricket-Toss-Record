@echo off

cd /d D:\Aditya\nodejs\crictoss

echo Starting Crictoss Server...
echo.

pm2 describe crictoss >nul 2>&1

if %errorlevel% neq 0 (
    echo Crictoss process not found. Starting...
    pm2 start server.js --name crictoss
) else (
    echo Crictoss process found. Restarting...
    pm2 restart crictoss
)

echo.
echo ================================
echo   LIVE SERVER LOGS
echo ================================
echo.

pm2 logs crictoss