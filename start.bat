@echo off
cls
echo ===================================
echo      AZHA LanchPad Server Setup
echo ===================================
echo.

echo Installing dependencies...
call npm install express
if errorlevel 1 (
    echo Error installing dependencies!
    pause
    exit /b 1
)

echo.
echo Starting server...
echo.
node server.js

if errorlevel 1 (
    echo.
    echo Error starting server!
    pause
    exit /b 1
)

echo.
echo Server is running at http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
pause