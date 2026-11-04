@echo off
title CineReserve FastAPI Gateway (Port 8000)
cd /d "%~dp0"
echo ========================================================
echo    CINERESERVE - FASTAPI GATEWAY (HTTP & WEBSOCKET)
echo ========================================================
echo Menjalankan Gateway penghubung Web Frontend ke gRPC...
echo.
python api_gateway.py
pause

