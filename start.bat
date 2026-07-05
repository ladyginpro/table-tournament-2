@echo off
cd /d "%~dp0"
if not exist "dist\index.html" (
  echo Application is not built. Run: npm.cmd run build
  pause
  exit /b 1
)
start "" http://localhost:3000/theory
npm.cmd start
pause
