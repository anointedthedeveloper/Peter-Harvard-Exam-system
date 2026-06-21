@echo off
echo Killing existing server processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo Starting server...
node\node.exe server.js
pause