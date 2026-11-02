import asyncio
import logging
import os
import uuid
from typing import Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor

import grpc
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import bioskop_pb2 as pb
import bioskop_pb2_grpc as pb_grpc

logging.basicConfig(level=logging.INFO, format="%(asctime)s [GATEWAY] %(levelname)s %(message)s")
log = logging.getLogger("api_gateway")

GRPC_SERVER = os.getenv("BIOSKOP_SERVER", "localhost:50051")
PRICE_PER_SEAT = 50000  # Rp50.000 per tiket

app = FastAPI(
    title="CineReserve API Gateway",
    description="HTTP & WebSocket Gateway bridging React Frontend with Python gRPC Cinema Reservation Server",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_grpc_stub():
    channel = grpc.insecure_channel(GRPC_SERVER)
    return pb_grpc.ReservasiBioskopStub(channel), channel


# Pydantic Models
class ReserveSeatsRequest(BaseModel):
    showtime_id: str
    nama_pemesan: str
    client_id: str
    seats: List[str]
    request_ids: Optional[Dict[str, str]] = None


class CancelReservationRequest(BaseModel):
    reservation_id: str
    client_id: str
    request_id: Optional[str] = None


@app.get("/api/health")
def health_check():
    stub, channel = get_grpc_stub()
    try:
        res = stub.HealthCheck(pb.HealthRequest(), timeout=3.0)
        return {
            "status": "online" if res.sehat else "degraded",
            "sehat": res.sehat,
            "pesan": res.pesan,
            "versi": res.versi,
            "grpc_server": GRPC_SERVER,
        }
    except grpc.RpcError as exc:
        raise HTTPException(status_code=503, detail=f"gRPC Backend Unreachable: {exc.details()}")
    finally:
        channel.close()


@app.get("/api/catalog")
def get_catalog():
    """Mengembalikan katalog film, tanggal, jadwal tayang, harga, dan venue."""
    dates = [
        {"dayName": "MON", "dayNumber": 18, "date": "2026-11-18", "isWeekend": False},
        {"dayName": "TUE", "dayNumber": 19, "date": "2026-11-19", "isWeekend": False},
        {"dayName": "WED", "dayNumber": 20, "date": "2026-11-20", "isWeekend": False},
        {"dayName": "THU", "dayNumber": 21, "date": "2026-11-21", "isWeekend": False},
        {"dayName": "FRI", "dayNumber": 22, "date": "2026-11-22", "isWeekend": False},
        {"dayName": "SAT", "dayNumber": 23, "date": "2026-11-23", "isWeekend": True},
        {"dayName": "SUN", "dayNumber": 24, "date": "2026-11-24", "isWeekend": True},
    ]

    time_slots = [
        {"slot": "11:45", "label": "11:45 AM", "format": "2D Atmos"},
        {"slot": "13:20", "label": "01:20 PM", "format": "IMAX 3D"},
        {"slot": "16:45", "label": "04:45 PM", "format": "IMAX 3D"},
        {"slot": "22:20", "label": "10:20 PM", "format": "2D Atmos"},
    ]

    movie = {
        "id": "FILM-001",
        "title": "Avatar: The Way of Water",
        "director": "James Cameron",
        "year": "2022",
        "duration": "3h 12m",
        "certification": "PG-13",
        "imdbRating": "8.6",
        "genres": ["Sci-Fi", "Action", "Adventure"],
        "synopsis": (
            "Set more than a decade after the events of the first film, Jake Sully and "
            "Neytiri have formed a family and are doing everything to stay together. However, "
            "they must leave their home and explore the regions of Pandora when an ancient threat resurfaces."
        ),
        "venue": "CineReserve IMAX Premiere — Studio 1",
        "pricePerSeat": PRICE_PER_SEAT,
        "currency": "IDR",
        "posterUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
        "trailerUrl": "https://www.youtube.com/watch?v=d9MyW72ELq0",
    }

    return {
        "movie": movie,
        "dates": dates,
        "timeSlots": time_slots,
        "defaultDate": "2026-11-18",
        "defaultTime": "11:45",
        "defaultShowtimeId": "FILM-001-2026-11-18-11:45",
    }


@app.get("/api/showtimes/{showtime_id}/seats")
def get_seats(showtime_id: str):
    stub, channel = get_grpc_stub()
    try:
        response = stub.GetDenahKursi(pb.DenahKursiRequest(showtime_id=showtime_id), timeout=5.0)
        return {
            "ditemukan": response.ditemukan,
            "pesan": response.pesan,
            "showtime_id": showtime_id,
            "version": response.version,
            "total_kursi": len(response.kursi),
            "kursi": [
                {
                    "seat_id": k.seat_id,
                    "status": k.status,
                    "reservation_id": k.reservation_id,
                }
                for k in response.kursi
            ],
        }
    except grpc.RpcError as exc:
        log.error("Error GetDenahKursi: %s", exc)
        raise HTTPException(status_code=500, detail=f"gRPC Error: {exc.details()}")
    finally:
        channel.close()


@app.post("/api/reservations")
def make_reservations(req: ReserveSeatsRequest):
    """
    Memesan satu atau beberapa kursi.
    Sesuai arsitektur sistem terdistribusi & RPC bioskop.proto,
    setiap kursi dipesan via satu pemanggilan Unary PesanKursi dengan UUID idempotensi.
    """
    if not req.seats:
        raise HTTPException(status_code=400, detail="Daftar kursi tidak boleh kosong.")

    stub, channel = get_grpc_stub()
    results = []
    successful_count = 0
    failed_count = 0

    try:
        for seat in req.seats:
            # Gunakan UUID yang diberikan client untuk retry, atau generate baru
            request_id = (req.request_ids or {}).get(seat) or str(uuid.uuid4())
            try:
                rpc_req = pb.PesanKursiRequest(
                    request_id=request_id,
                    client_id=req.client_id,
                    showtime_id=req.showtime_id,
                    seat_id=seat,
                    nama_pemesan=req.nama_pemesan,
                )
                res = stub.PesanKursi(rpc_req, timeout=5.0)
                item_result = {
                    "seat_id": seat,
                    "sukses": res.sukses,
                    "pesan": res.pesan,
                    "reservation_id": res.reservation_id,
                    "status": res.status,
                    "request_id": request_id,
                }
                if res.sukses:
                    successful_count += 1
                else:
                    failed_count += 1
                results.append(item_result)
            except grpc.RpcError as exc:
                failed_count += 1
                results.append({
                    "seat_id": seat,
                    "sukses": False,
                    "pesan": f"RPC Error: {exc.details() or exc.code().name}",
                    "reservation_id": "",
                    "status": "ERROR",
                    "request_id": request_id,
                })
    finally:
        channel.close()

    return {
        "showtime_id": req.showtime_id,
        "nama_pemesan": req.nama_pemesan,
        "total_requested": len(req.seats),
        "successful_count": successful_count,
        "failed_count": failed_count,
        "is_all_successful": successful_count == len(req.seats),
        "results": results,
    }


@app.post("/api/reservations/cancel")
def cancel_reservation(req: CancelReservationRequest):
    stub, channel = get_grpc_stub()
    request_id = req.request_id or str(uuid.uuid4())
    try:
        rpc_req = pb.BatalkanReservasiRequest(
            request_id=request_id,
            client_id=req.client_id,
            reservation_id=req.reservation_id,
        )
        res = stub.BatalkanReservasi(rpc_req, timeout=5.0)
        return {
            "sukses": res.sukses,
            "pesan": res.pesan,
            "reservation_id": res.reservation_id,
        }
    except grpc.RpcError as exc:
        raise HTTPException(status_code=500, detail=f"gRPC Error: {exc.details()}")
    finally:
        channel.close()


@app.websocket("/ws/showtimes/{showtime_id}")
async def websocket_seat_stream(websocket: WebSocket, showtime_id: str):
    """
    WebSocket endpoint yang menjembatani Server Streaming RPC StreamStatusKursi ke browser.
    Ketika ada pembaruan status kursi di server gRPC, snapshot baru diteruskan langsung ke frontend.
    """
    await websocket.accept()
    log.info("WebSocket connected for showtime: %s", showtime_id)

    loop = asyncio.get_running_loop()
    channel = grpc.insecure_channel(GRPC_SERVER)
    stub = pb_grpc.ReservasiBioskopStub(channel)

    # Membuka gRPC server streaming
    # Max duration 300 detik (5 menit), server akan mengirim snapshot awal & update jika ada perubahan
    stop_event = asyncio.Event()

    def grpc_stream_worker():
        try:
            stream = stub.StreamStatusKursi(
                pb.StreamStatusRequest(showtime_id=showtime_id, max_duration_seconds=300),
                timeout=310,
            )
            for update in stream:
                if stop_event.is_set():
                    break
                payload = {
                    "type": "SEAT_UPDATE",
                    "showtime_id": update.showtime_id,
                    "version": update.version,
                    "server_time": update.server_time,
                    "pesan": update.pesan,
                    "kursi": [
                        {
                            "seat_id": k.seat_id,
                            "status": k.status,
                            "reservation_id": k.reservation_id,
                        }
                        for k in update.kursi
                    ],
                }
                # Forward to asyncio loop
                asyncio.run_coroutine_threadsafe(websocket.send_json(payload), loop)
        except grpc.RpcError as exc:
            log.warning("gRPC Stream disconnected: %s", exc)
        except Exception as exc:
            log.warning("Stream worker error: %s", exc)

    executor = ThreadPoolExecutor(max_workers=2)
    stream_future = loop.run_in_executor(executor, grpc_stream_worker)

    try:
        while True:
            # Tetap mendengarkan pesan dari browser jika ada (misal heartbeat / ping)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        log.info("WebSocket client disconnected for showtime: %s", showtime_id)
    except Exception as exc:
        log.warning("WebSocket error: %s", exc)
    finally:
        stop_event.set()
        channel.close()
        executor.shutdown(wait=False)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api_gateway:app", host="0.0.0.0", port=8000, reload=False)
