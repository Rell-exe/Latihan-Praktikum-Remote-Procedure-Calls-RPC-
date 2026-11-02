"""Uji race condition: banyak client memesan kursi identik secara bersamaan."""
import os
import uuid
from concurrent.futures import ThreadPoolExecutor

import grpc
import bioskop_pb2 as pb
import bioskop_pb2_grpc as pb_grpc

SERVER = os.getenv("BIOSKOP_SERVER", "localhost:50051")
SHOWTIME = os.getenv("BIOSKOP_SHOWTIME", "FILM-001-2026-11-05-19:00")
TARGET_SEAT = os.getenv("BIOSKOP_TEST_SEAT", "E08")
CLIENTS = int(os.getenv("BIOSKOP_TEST_CLIENTS", "20"))


def main():
    def attempt(index):
        with grpc.insecure_channel(SERVER) as channel:
            grpc.channel_ready_future(channel).result(timeout=10)
            stub = pb_grpc.ReservasiBioskopStub(channel)
            request = pb.PesanKursiRequest(
                request_id=str(uuid.uuid4()),
                client_id=f"race-client-{index}",
                showtime_id=SHOWTIME,
                seat_id=TARGET_SEAT,
                nama_pemesan=f"Penguji {index}",
            )
            result = stub.PesanKursi(request, timeout=10)
            return result.sukses, result.pesan

    with ThreadPoolExecutor(max_workers=CLIENTS) as pool:
        results = list(pool.map(attempt, range(CLIENTS)))

    winners = sum(1 for success, _ in results if success)
    losers = CLIENTS - winners
    print(f"Jumlah client: {CLIENTS}")
    print(f"Berhasil: {winners}")
    print(f"Ditolak: {losers}")
    for index, result in enumerate(results):
        print(f"Client {index}: {'BERHASIL' if result[0] else 'DITOLAK'} - {result[1]}")

    assert winners == 1, f"Seharusnya tepat 1 pemenang, tetapi didapat {winners}"
    print("LULUS: satu kursi hanya berhasil dipesan oleh satu client.")


if __name__ == "__main__":
    main()
