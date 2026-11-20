@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Install Node.js LTS from https://nodejs.org/ and try again.
  pause
  exit /b 1
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm is not found. Reinstall Node.js LTS from https://nodejs.org/.
  pause
  exit /b 1
)
if not exist "node_modules\.bin\vite.cmd" (
  echo [1/2] Installing project dependencies. This needs internet the first time...
  call npm ci
  if errorlevel 1 (
    echo [ERROR] npm ci failed. Check your internet connection.
    pause
    exit /b 1
  )
)
echo [2/2] Starting VLADGELIK...
start "VLADGELIK SERVER" cmd /k "call npm run dev -- --strictPort --port 5173"
timeout /t 4 /nobreak >nul
start "" "http://127.0.0.1:5173/"
echo The website is open. Keep the VLADGELIK SERVER window open while playing.
exit /b 0
