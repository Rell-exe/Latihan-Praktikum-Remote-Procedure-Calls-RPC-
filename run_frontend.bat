@echo off
title CineReserve Frontend Web (Port 5173)
cd /d "%~dp0\frontend"
echo ========================================================
echo    CINERESERVE - REACT VITE WEB FRONTEND
echo ========================================================
echo Menjalankan Vite Web Server di http://0.0.0.0:5173 ...
echo.
npm run dev -- --host 0.0.0.0 --port 5173
pause

