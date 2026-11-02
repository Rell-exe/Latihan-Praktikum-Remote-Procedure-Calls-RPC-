@echo off
echo =================================================
echo    CINERESERVE - SISTEM RESERVASI BIOSKOP RPC   
echo =================================================

echo [1/3] Starting Python gRPC Server on port 50051...
start "CineReserve gRPC Server (50051)" cmd /k ".\venv\Scripts\python.exe server.py"

timeout /t 2 /nobreak >nul

echo [2/3] Starting FastAPI API Gateway on port 8000...
start "CineReserve API Gateway (8000)" cmd /k ".\venv\Scripts\python.exe api_gateway.py"

timeout /t 2 /nobreak >nul

echo [3/3] Starting Vite React Frontend on port 5173...
start "CineReserve Frontend (5173)" cmd /k "cd frontend && npm run dev -- --host 0.0.0.0 --port 5173"

echo.
echo All services launched!
echo Open your browser at: http://localhost:5173/
echo API Gateway Docs at: http://localhost:8000/docs
pause
