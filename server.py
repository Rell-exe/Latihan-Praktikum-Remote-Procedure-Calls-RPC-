import hashlib
import json
import logging
import os
import sqlite3
import time
import uuid
from concurrent import futures
from datetime import datetime, timezone

import grpc

import bioskop_pb2 as pb
import bioskop_pb2_grpc as pb_grpc

DB_PATH = os.getenv("BIOSKOP_DB", "data/bioskop.db")
HOST = os.getenv("GRPC_HOST", "0.0.0.0")
PORT = int(os.getenv("GRPC_PORT", "50051"))
STREAM_DEFAULT_SECONDS = int(os.getenv("STREAM_DEFAULT_SECONDS", "60"))
POLL_INTERVAL_SECONDS = float(os.getenv("STREAM_POLL_SECONDS", "0.5"))

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(threadName)s %(message)s",
)
log = logging.getLogger("bioskop-rpc")


def connect_db():
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=15, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 15000")
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = connect_db()
    try:
        conn.execute("PRAGMA journal_mode = WAL")
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS showtimes (
            showtime_id TEXT PRIMARY KEY,
            film_name TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS seats (
            showtime_id TEXT NOT NULL,
            seat_id TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('AVAILABLE', 'BOOKED')),
            reservation_id TEXT,
            PRIMARY KEY(showtime_id, seat_id),
            FOREIGN KEY(showtime_id) REFERENCES showtimes(showtime_id)
        );
        CREATE TABLE IF NOT EXISTS reservations (
            reservation_id TEXT PRIMARY KEY,
            showtime_id TEXT NOT NULL,
            seat_id TEXT NOT NULL,
            client_id TEXT NOT NULL,
            nama_pemesan TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'CANCELLED')),
            created_at TEXT NOT NULL,
            cancelled_at TEXT,
            FOREIGN KEY(showtime_id, seat_id) REFERENCES seats(showtime_id, seat_id)
        );
        CREATE TABLE IF NOT EXISTS request_dedup (
            request_id TEXT PRIMARY KEY,
            fingerprint TEXT NOT NULL,
            response_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS system_version (
            showtime_id TEXT PRIMARY KEY,
            version INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY(showtime_id) REFERENCES showtimes(showtime_id)
        );
        """)
        showtime = "FILM-001-2026-11-05-19:00"
        conn.execute(
            "INSERT OR IGNORE INTO showtimes VALUES (?, ?, ?)",
            (showtime, "Film Contoh", utc_now()),
        )
        conn.execute(
            "INSERT OR IGNORE INTO system_version(showtime_id, version) VALUES (?, 0)",
            (showtime,),
        )
        for row in range(1, 6):
            for col in range(1, 9):
                seat = f"{chr(64 + row)}{col:02d}"
                conn.execute(
                    "INSERT OR IGNORE INTO seats(showtime_id, seat_id, status) VALUES (?, ?, 'AVAILABLE')",
                    (showtime, seat),
                )
    finally:
        conn.close()
    log.info("Database siap. Jadwal demo: FILM-001-2026-11-05-19:00")


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def fingerprint(payload):
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get_seat_rows(conn, showtime_id):
    return conn.execute(
        "SELECT seat_id, status, COALESCE(reservation_id, '') AS reservation_id "
        "FROM seats WHERE showtime_id = ? ORDER BY seat_id",
        (showtime_id,),
    ).fetchall()


def get_version(conn, showtime_id):
    row = conn.execute(
        "SELECT version FROM system_version WHERE showtime_id = ?",
        (showtime_id,),
    ).fetchone()
    return int(row["version"]) if row else 0


def make_snapshot(conn, showtime_id, message="Status kursi terkini"):
    rows = get_seat_rows(conn, showtime_id)
    return pb.StatusKursiUpdate(
        showtime_id=showtime_id,
        kursi=[
            pb.Kursi(
                seat_id=r["seat_id"],
                status=r["status"],
                reservation_id=r["reservation_id"],
            )
            for r in rows
        ],
        version=get_version(conn, showtime_id),
        server_time=utc_now(),
        pesan=message,
    )


class ReservasiBioskop(pb_grpc.ReservasiBioskopServicer):
    def PesanKursi(self, request, context):
        required = [request.request_id, request.client_id, request.showtime_id,
                    request.seat_id, request.nama_pemesan]
        if not all(required):
            context.abort(grpc.StatusCode.INVALID_ARGUMENT,
                          "request_id, client_id, showtime_id, seat_id, dan nama_pemesan wajib diisi")
        try:
            uuid.UUID(request.request_id)
        except ValueError:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "request_id harus berupa UUID")

        payload = {
            "operation": "PesanKursi",
            "client_id": request.client_id,
            "showtime_id": request.showtime_id,
            "seat_id": request.seat_id,
            "nama_pemesan": request.nama_pemesan,
        }
        fp = fingerprint(payload)
        conn = connect_db()
        try:
            # BEGIN IMMEDIATE memperoleh reserved write lock sebelum membaca status.
            # Transaksi ini membuat pemeriksaan dan perubahan status menjadi satu unit atomik.
            conn.execute("BEGIN IMMEDIATE")

            previous = conn.execute(
                "SELECT fingerprint, response_json FROM request_dedup WHERE request_id = ?",
                (request.request_id,),
            ).fetchone()
            if previous:
                if previous["fingerprint"] != fp:
                    conn.rollback()
                    context.abort(grpc.StatusCode.ALREADY_EXISTS,
                                  "request_id pernah dipakai untuk isi permintaan berbeda")
                data = json.loads(previous["response_json"])
                conn.commit()
                return pb.PesanKursiResponse(**data)

            show = conn.execute(
                "SELECT 1 FROM showtimes WHERE showtime_id = ?",
                (request.showtime_id,),
            ).fetchone()
            if not show:
                result = {
                    "sukses": False, "pesan": "Jadwal tayang tidak ditemukan",
                    "reservation_id": "", "seat_id": request.seat_id, "status": "NOT_FOUND"
                }
            else:
                seat = conn.execute(
                    "SELECT status FROM seats WHERE showtime_id = ? AND seat_id = ?",
                    (request.showtime_id, request.seat_id),
                ).fetchone()
                if not seat:
                    result = {
                        "sukses": False, "pesan": "Nomor kursi tidak tersedia pada denah",
                        "reservation_id": "", "seat_id": request.seat_id, "status": "INVALID_SEAT"
                    }
                elif seat["status"] == "BOOKED":
                    result = {
                        "sukses": False, "pesan": "Kursi sudah dipesan oleh client lain",
                        "reservation_id": "", "seat_id": request.seat_id, "status": "BOOKED"
                    }
                else:
                    reservation_id = str(uuid.uuid4())
                    conn.execute(
                        "INSERT INTO reservations VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, NULL)",
                        (reservation_id, request.showtime_id, request.seat_id,
                         request.client_id, request.nama_pemesan, utc_now()),
                    )
                    conn.execute(
                        "UPDATE seats SET status='BOOKED', reservation_id=? "
                        "WHERE showtime_id=? AND seat_id=? AND status='AVAILABLE'",
                        (reservation_id, request.showtime_id, request.seat_id),
                    )
                    result = {
                        "sukses": True, "pesan": "Reservasi berhasil",
                        "reservation_id": reservation_id, "seat_id": request.seat_id,
                        "status": "BOOKED"
                    }
                    conn.execute(
                        "UPDATE system_version SET version = version + 1 WHERE showtime_id = ?",
                        (request.showtime_id,),
                    )

            conn.execute(
                "INSERT INTO request_dedup VALUES (?, ?, ?, ?)",
                (request.request_id, fp, json.dumps(result, ensure_ascii=False), utc_now()),
            )
            conn.commit()
            return pb.PesanKursiResponse(**result)
        except grpc.RpcError:
            raise
        except sqlite3.Error as exc:
            conn.rollback()
            log.exception("Kesalahan database pada PesanKursi")
            context.abort(grpc.StatusCode.INTERNAL, f"Kesalahan database: {exc}")
        finally:
            conn.close()

    def GetDenahKursi(self, request, context):
        if not request.showtime_id:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "showtime_id wajib diisi")
        conn = connect_db()
        try:
            exists = conn.execute(
                "SELECT 1 FROM showtimes WHERE showtime_id = ?",
                (request.showtime_id,),
            ).fetchone()
            if not exists:
                return pb.DenahKursiResponse(ditemukan=False, pesan="Jadwal tidak ditemukan")
            rows = get_seat_rows(conn, request.showtime_id)
            return pb.DenahKursiResponse(
                ditemukan=True,
                pesan=f"Denah memuat {len(rows)} kursi",
                kursi=[
                    pb.Kursi(seat_id=r["seat_id"], status=r["status"],
                             reservation_id=r["reservation_id"])
                    for r in rows
                ],
                version=get_version(conn, request.showtime_id),
            )
        finally:
            conn.close()

    def StreamStatusKursi(self, request, context):
        if not request.showtime_id:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "showtime_id wajib diisi")
        duration = request.max_duration_seconds or STREAM_DEFAULT_SECONDS
        duration = max(1, min(duration, 300))
        started = time.monotonic()
        last_signature = None

        while context.is_active() and time.monotonic() - started < duration:
            conn = connect_db()
            try:
                exists = conn.execute(
                    "SELECT 1 FROM showtimes WHERE showtime_id = ?",
                    (request.showtime_id,),
                ).fetchone()
                if not exists:
                    context.abort(grpc.StatusCode.NOT_FOUND, "Jadwal tayang tidak ditemukan")
                snapshot = make_snapshot(conn, request.showtime_id)
                signature = (
                    snapshot.version,
                    tuple((s.seat_id, s.status, s.reservation_id) for s in snapshot.kursi),
                )
            finally:
                conn.close()

            if signature != last_signature:
                yield snapshot
                last_signature = signature
            time.sleep(POLL_INTERVAL_SECONDS)

    def BatalkanReservasi(self, request, context):
        if not request.request_id or not request.client_id or not request.reservation_id:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT,
                          "request_id, client_id, dan reservation_id wajib diisi")
        try:
            uuid.UUID(request.request_id)
        except ValueError:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "request_id harus berupa UUID")

        payload = {
            "operation": "BatalkanReservasi",
            "client_id": request.client_id,
            "reservation_id": request.reservation_id,
        }
        fp = fingerprint(payload)
        conn = connect_db()
        try:
            conn.execute("BEGIN IMMEDIATE")
            previous = conn.execute(
                "SELECT fingerprint, response_json FROM request_dedup WHERE request_id = ?",
                (request.request_id,),
            ).fetchone()
            if previous:
                if previous["fingerprint"] != fp:
                    conn.rollback()
                    context.abort(grpc.StatusCode.ALREADY_EXISTS,
                                  "request_id digunakan untuk permintaan berbeda")
                data = json.loads(previous["response_json"])
                conn.commit()
                return pb.OperasiResponse(**data)

            reservation = conn.execute(
                "SELECT * FROM reservations WHERE reservation_id = ?",
                (request.reservation_id,),
            ).fetchone()
            if not reservation:
                result = {"sukses": False, "pesan": "Reservasi tidak ditemukan",
                          "reservation_id": request.reservation_id}
            elif reservation["client_id"] != request.client_id:
                result = {"sukses": False, "pesan": "Client tidak memiliki reservasi ini",
                          "reservation_id": request.reservation_id}
            elif reservation["status"] != "ACTIVE":
                result = {"sukses": False, "pesan": "Reservasi sudah tidak aktif",
                          "reservation_id": request.reservation_id}
            else:
                conn.execute(
                    "UPDATE reservations SET status='CANCELLED', cancelled_at=? "
                    "WHERE reservation_id=?",
                    (utc_now(), request.reservation_id),
                )
                conn.execute(
                    "UPDATE seats SET status='AVAILABLE', reservation_id=NULL "
                    "WHERE showtime_id=? AND seat_id=? AND reservation_id=?",
                    (reservation["showtime_id"], reservation["seat_id"],
                     request.reservation_id),
                )
                conn.execute(
                    "UPDATE system_version SET version=version+1 WHERE showtime_id=?",
                    (reservation["showtime_id"],),
                )
                result = {"sukses": True, "pesan": "Reservasi berhasil dibatalkan",
                          "reservation_id": request.reservation_id}

            conn.execute(
                "INSERT INTO request_dedup VALUES (?, ?, ?, ?)",
                (request.request_id, fp, json.dumps(result, ensure_ascii=False), utc_now()),
            )
            conn.commit()
            return pb.OperasiResponse(**result)
        except grpc.RpcError:
            raise
        except sqlite3.Error as exc:
            conn.rollback()
            log.exception("Kesalahan database pada BatalkanReservasi")
            context.abort(grpc.StatusCode.INTERNAL, f"Kesalahan database: {exc}")
        finally:
            conn.close()

    def HealthCheck(self, request, context):
        try:
            conn = connect_db()
            conn.execute("SELECT 1").fetchone()
            conn.close()
            return pb.HealthResponse(sehat=True, pesan="Server dan database siap",
                                     versi="1.0.0")
        except sqlite3.Error:
            return pb.HealthResponse(sehat=False, pesan="Database tidak dapat diakses",
                                     versi="1.0.0")


def serve():
    init_db()
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=int(os.getenv("GRPC_WORKERS", "20"))),
        options=[
            ("grpc.max_receive_message_length", 4 * 1024 * 1024),
            ("grpc.max_send_message_length", 4 * 1024 * 1024),
        ],
    )
    pb_grpc.add_ReservasiBioskopServicer_to_server(ReservasiBioskop(), server)
    server.add_insecure_port(f"{HOST}:{PORT}")
    server.start()
    log.info("gRPC server berjalan pada %s:%s", HOST, PORT)
    try:
        server.wait_for_termination()
    except KeyboardInterrupt:
        log.info("Server dihentikan")
        server.stop(grace=3)


if __name__ == "__main__":
    serve()
