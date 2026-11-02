# CineReserve Launcher Script (PowerShell)
# Menjalankan gRPC Server, FastAPI Gateway, dan Vite Frontend

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   CINERESERVE - SISTEM RESERVASI BIOSKOP RPC   " -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Cyan

# 1. Jalankan gRPC Server pada Port 50051 di terminal baru
Write-Host "[1/3] Menjalankan Python gRPC Server (port 50051)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting gRPC Server...'; .\venv\Scripts\python.exe server.py"

Start-Sleep -Seconds 2

# 2. Jalankan FastAPI API Gateway pada Port 8000 di terminal baru
Write-Host "[2/3] Menjalankan FastAPI Gateway (port 8000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting FastAPI Gateway...'; .\venv\Scripts\python.exe api_gateway.py"

Start-Sleep -Seconds 2

# 3. Jalankan Vite Frontend pada Port 5173 di terminal baru
Write-Host "[3/3] Menjalankan React Vite Frontend (port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; Write-Host 'Starting Vite Frontend...'; npm run dev -- --host 0.0.0.0 --port 5173"

Write-Host ""
Write-Host "Seluruh layanan CineReserve berhasil diluncurkan!" -ForegroundColor Cyan
Write-Host "Buka browser pada: http://localhost:5173/" -ForegroundColor Yellow
Write-Host "Swagger API Docs:  http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "gRPC Backend:      localhost:50051" -ForegroundColor Yellow
