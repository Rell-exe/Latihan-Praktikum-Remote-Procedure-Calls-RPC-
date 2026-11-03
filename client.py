import os
import time
import uuid

import grpc

import bioskop_pb2 as pb
import bioskop_pb2_grpc as pb_grpc

import sys

SERVER = sys.argv[1] if len(sys.argv) > 1 else os.getenv("BIOSKOP_SERVER", "localhost:50051")
if ":" not in SERVER:
    SERVER = f"{SERVER}:50051"
SHOWTIME = os.getenv("BIOSKOP_SHOWTIME", "FILM-001-2026-11-05-19:00")
CLIENT_ID = os.getenv("BIOSKOP_CLIENT_ID", f"client-{uuid.uuid4().hex[:8]}")


def tampilkan_denah(stub):
    response = stub.GetDenahKursi(pb.DenahKursiRequest(showtime_id=SHOWTIME), timeout=5)
    print(f"\n{response.pesan} | versi={response.version}")
    print("      " + " ".join(f"{i:02d}" for i in range(1, 9)))
    for row in "ABCDE":
        items = []
        for seat in response.kursi:
            if seat.seat_id.startswith(row):
                items.append("XX" if seat.status == "BOOKED" else "__")
        print(f"  {row}   " + "  ".join(items))
    print("Keterangan: __ tersedia, XX sudah dipesan\n")


def pesan_kursi(stub):
    seat_id = input("Nomor kursi (contoh A01): ").strip().upper()
    nama = input("Nama pemesan: ").strip()
    if not seat_id or not nama:
        print("Nomor kursi dan nama wajib diisi.")
        return
    request_id = str(uuid.uuid4())  # dibuat sekali, dipakai ulang saat retry
    request = pb.PesanKursiRequest(
        request_id=request_id,
        client_id=CLIENT_ID,
        showtime_id=SHOWTIME,
        seat_id=seat_id,
        nama_pemesan=nama,
    )
    delays = [0.5, 1.0, 2.0]
    for attempt in range(4):
        try:
            result = stub.PesanKursi(request, timeout=3.0)
            print(f"{'BERHASIL' if result.sukses else 'GAGAL'}: {result.pesan}")
            if result.reservation_id:
                print("ID reservasi:", result.reservation_id)
            return
        except grpc.RpcError as exc:
            retryable = exc.code() in (
                grpc.StatusCode.DEADLINE_EXCEEDED,
                grpc.StatusCode.UNAVAILABLE,
            )
            if not retryable or attempt == 3:
                print("RPC error:", exc.code(), exc.details())
                return
            delay = delays[attempt]
            print(f"{exc.code().name}; retry dalam {delay} detik (request_id tetap sama)")
            time.sleep(delay)


def stream_status(stub):
    print("Memantau perubahan status selama 60 detik. Tekan Ctrl+C untuk berhenti.")
    try:
        updates = stub.StreamStatusKursi(
            pb.StreamStatusRequest(showtime_id=SHOWTIME, max_duration_seconds=60),
            timeout=65,
        )
        for update in updates:
            booked = [s.seat_id for s in update.kursi if s.status == "BOOKED"]
            print(
                f"[versi {update.version}] {update.server_time} | "
                f"kursi terisi: {', '.join(booked) if booked else '-'}"
            )
    except KeyboardInterrupt:
        print("Pemantauan dihentikan oleh pengguna.")
    except grpc.RpcError as exc:
        print("Streaming error:", exc.code(), exc.details())


def batalkan(stub):
    reservation_id = input("ID reservasi: ").strip()
    request = pb.BatalkanReservasiRequest(
        request_id=str(uuid.uuid4()),
        client_id=CLIENT_ID,
        reservation_id=reservation_id,
    )
    try:
        result = stub.BatalkanReservasi(request, timeout=3)
        print(result.pesan)
    except grpc.RpcError as exc:
        print("RPC error:", exc.code(), exc.details())


def main():
    print(f"Terhubung ke {SERVER} sebagai {CLIENT_ID}")
    try:
        with grpc.insecure_channel(SERVER) as channel:
            grpc.channel_ready_future(channel).result(timeout=5)
            stub = pb_grpc.ReservasiBioskopStub(channel)
            health = stub.HealthCheck(pb.HealthRequest(), timeout=3)
            print("Health:", health.pesan)
            while True:
                print("\n=== SISTEM RESERVASI BIOSKOP ===")
                print("1. Lihat denah kursi")
                print("2. Pesan kursi")
                print("3. Pantau status kursi (streaming)")
                print("4. Batalkan reservasi")
                print("5. Keluar")
                choice = input("Pilih: ").strip()
                if choice == "1":
                    tampilkan_denah(stub)
                elif choice == "2":
                    pesan_kursi(stub)
                elif choice == "3":
                    stream_status(stub)
                elif choice == "4":
                    batalkan(stub)
                elif choice == "5":
                    break
                else:
                    print("Pilihan tidak dikenal.")
    except grpc.FutureTimeoutError:
        print(f"Server tidak dapat dijangkau: {SERVER}")
    except grpc.RpcError as exc:
        print("Koneksi RPC gagal:", exc.code(), exc.details())


if __name__ == "__main__":
    main()
