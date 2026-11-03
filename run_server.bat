@echo off
title CineReserve gRPC Server (Port 50051)
cd /d "%~dp0"
echo ========================================================
echo    CINERESERVE - gRPC SERVER BIOSKOP
echo ========================================================
echo IP Server ini : 172.20.10.2 (Cek ipconfig jika ganti WiFi)
echo Port          : 50051
echo.
echo Menjalankan Python gRPC Server...
python server.py
pause
