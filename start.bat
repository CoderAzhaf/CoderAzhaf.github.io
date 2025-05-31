@echo off
title AZHA LanchPad Server
color 0A
cls

echo ===================================
echo      AZHA LanchPad Server Setup
echo ===================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Create package.json if it doesn't exist
if not exist package.json (
    echo Creating package.json...
    echo {"name": "azha-lanchpad","version": "1.0.0","main": "server.js"} > package.json
)

REM Install dependencies
echo Installing dependencies...
call npm install express --save
if errorlevel 1 (
    echo Error installing dependencies!
    pause
    exit /b 1
)

REM Start the server
echo.
echo Starting server...
echo.
start http://localhost:3000
node server.js

if errorlevel 1 (
    echo.
    echo Error starting server!
    pause
    exit /b 1
)