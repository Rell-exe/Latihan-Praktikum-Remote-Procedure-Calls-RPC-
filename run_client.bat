@echo off
title CineReserve gRPC Client
cd /d "%~dp0"
echo ========================================================
echo    CINERESERVE - gRPC CLIENT BIOSKOP
echo ========================================================
set /p SERVER_IP="Masukkan IP Server [default: localhost]: "
if "%SERVER_IP%"=="" set SERVER_IP=localhost

set BIOSKOP_SERVER=%SERVER_IP%:50051
echo Menghubungkan ke %BIOSKOP_SERVER%...
echo.
python client.py
pause

