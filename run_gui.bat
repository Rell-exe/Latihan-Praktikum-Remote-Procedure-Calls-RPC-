@echo off
title CineReserve gRPC Desktop GUI
cd /d "%~dp0"
echo ========================================================
echo    CINERESERVE - DESKTOP GUI BIOSKOP (gRPC)
echo ========================================================
set /p SERVER_IP="Masukkan IP Server [default: 172.20.10.2]: "
if "%SERVER_IP%"=="" set SERVER_IP=172.20.10.2

echo Membuka GUI dan menghubungkan ke %SERVER_IP%:50051...
python gui_client.py %SERVER_IP%:50051
pause

