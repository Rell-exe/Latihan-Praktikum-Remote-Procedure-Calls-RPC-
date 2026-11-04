"""Uji race condition: banyak client memesan kursi identik secara bersamaan."""
import os
import sys
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

# Pastikan direktori root proyek masuk ke sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import grpc
import bioskop_pb2 as pb
import bioskop_pb2_grpc as pb_grpc

SERVER = os.getenv("BIOSKOP_SERVER", "localhost:50051")
SHOWTIME = os.getenv("BIOSKOP_SHOWTIME", "FILM-001-2026-11-05-19:00")
TARGET_SEAT = os.getenv("BIOSKOP_TEST_SEAT", "E08")
CLIENTS = int(os.getenv("BIOSKOP_TEST_CLIENTS", "20"))


def main():
    target_seat = TARGET_SEAT

    # Periksa ketersediaan kursi target terlebih dahulu
    try:
        with grpc.insecure_channel(SERVER) as channel:
            grpc.channel_ready_future(channel).result(timeout=5)
            stub = pb_grpc.ReservasiBioskopStub(channel)
            denah = stub.GetDenahKursi(pb.DenahKursiRequest(showtime_id=SHOWTIME), timeout=5)
            avail = [k.seat_id for k in denah.kursi if k.status == "AVAILABLE"]
            if target_seat not in avail and avail:
                target_seat = avail[0]
                print(f"Kursi {TARGET_SEAT} sudah terisi/tidak tersedia, memilih kursi kosong: {target_seat}")
    except Exception as e:
        print(f"Peringatan: Gagal memeriksa denah ({e}), tetap menggunakan kursi {target_seat}")

    print(f"--- MEMULAI UJI RACE CONDITION ---")
    print(f"Server      : {SERVER}")
    print(f"Target Kursi: {target_seat}")
    print(f"Jumlah Klien: {CLIENTS} (serentak)")
    print(f"----------------------------------\n")

    def attempt(index):
        with grpc.insecure_channel(SERVER) as channel:
            grpc.channel_ready_future(channel).result(timeout=10)
            stub = pb_grpc.ReservasiBioskopStub(channel)
            request = pb.PesanKursiRequest(
                request_id=str(uuid.uuid4()),
                client_id=f"race-client-{index}",
                showtime_id=SHOWTIME,
                seat_id=target_seat,
                nama_pemesan=f"Penguji {index}",
            )
            result = stub.PesanKursi(request, timeout=10)
            return result.sukses, result.pesan

    with ThreadPoolExecutor(max_workers=CLIENTS) as pool:
        results = list(pool.map(attempt, range(CLIENTS)))

    winners = sum(1 for success, _ in results if success)
    losers = CLIENTS - winners
    print(f"Hasil Uji:")
    print(f"- Total Client: {CLIENTS}")
    print(f"- Berhasil    : {winners}")
    print(f"- Ditolak     : {losers}\n")

    for index, result in enumerate(results):
        status = "BERHASIL" if result[0] else "DITOLAK"
        print(f"Client {index:02d}: {status} - {result[1]}")

    assert winners == 1, f"Seharusnya tepat 1 pemenang, tetapi didapat {winners}"
    print("\n✅ LULUS: Tepat 1 client berhasil memesan, 19 lainnya ditolak tanpa merusak data.")


if __name__ == "__main__":
    main()
