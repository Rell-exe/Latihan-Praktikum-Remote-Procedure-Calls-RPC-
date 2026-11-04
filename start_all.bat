@echo off
title CineReserve Stack Launcher
cd /d "%~dp0"

echo =================================================
echo    CINERESERVE - SISTEM RESERVASI BIOSKOP RPC   
echo =================================================

rem Tentukan executable python (venv atau global)
set PYTHON_CMD=python
if exist ".\venv\Scripts\python.exe" (
    set PYTHON_CMD=.\venv\Scripts\python.exe
)

echo [1/3] Starting Python gRPC Server on port 50051...
start "CineReserve gRPC Server (50051)" cmd /k "%PYTHON_CMD% server.py"

timeout /t 2 /nobreak >nul

echo [2/3] Starting FastAPI API Gateway on port 8000...
start "CineReserve API Gateway (8000)" cmd /k "%PYTHON_CMD% api_gateway.py"

timeout /t 2 /nobreak >nul

echo [3/3] Starting Vite React Frontend on port 5173...
start "CineReserve Frontend (5173)" cmd /k "cd frontend && npm run dev -- --host 0.0.0.0 --port 5173"

echo.
echo All services launched!
echo Buka di browser laptop Anda : http://localhost:5173/
echo Buka di browser laptop clien: http://172.20.10.2:5173/
echo.
pause
