@echo off
title Focus Room
cd /d "%~dp0"

set "NODE=C:\Users\bl162\.workbuddy\binaries\node\versions\22.12.0\node.exe"
set "PORT=3212"

echo ============================================
echo   Focus Room is starting...
echo.
echo   Open in browser:  http://localhost:%PORT%
echo   Close this window to stop the server.
echo ============================================
echo.

if not exist "%NODE%" (
    echo [ERROR] Node.js not found: %NODE%
    pause
    exit /b 1
)

if not exist "node_modules\next\dist\bin\next" (
    echo [ERROR] next not found. Please re-copy the FocusRoom folder.
    pause
    exit /b 1
)

echo Starting server...
start "" /b cmd /c "ping -n 4 127.0.0.1 >nul & start http://localhost:%PORT%"

"%NODE%" "%~dp0node_modules\next\dist\bin\next" start -p %PORT%

echo.
echo Server stopped.
pause
