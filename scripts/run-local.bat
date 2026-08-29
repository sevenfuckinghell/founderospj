@echo off
title Founder OS - local dev server
echo.
echo  FOUNDER OS - starting local dev server
echo  Requires: Node.js 20 LTS (https://nodejs.org)
echo.
call npm install
if errorlevel 1 (
  echo.
  echo  npm install failed - check your Node.js installation.
  pause
  exit /b 1
)
echo.
echo  Opening dev server at http://localhost:5173 ...
call npm run dev
pause
