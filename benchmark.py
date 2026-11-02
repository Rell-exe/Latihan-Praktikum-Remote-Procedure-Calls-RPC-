"""Benchmark RPC untuk 1, 5, dan 20 client bersamaan.
Mengukur GetDenahKursi (read-only) agar hasil tidak tercampur konflik perebutan kursi.
"""
import argparse
import csv
import os
import statistics
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import grpc
import bioskop_pb2 as pb
import bioskop_pb2_grpc as pb_grpc


def run_benchmark(server, showtime, clients, total_requests):
    latencies = []
    errors = 0
    per_client = max(1, total_requests // clients)

    def worker():
        local_latencies = []
        local_errors = 0
        with grpc.insecure_channel(server) as channel:
            grpc.channel_ready_future(channel).result(timeout=10)
            stub = pb_grpc.ReservasiBioskopStub(channel)
            for _ in range(per_client):
                start = time.perf_counter()
                try:
                    stub.GetDenahKursi(
                        pb.DenahKursiRequest(showtime_id=showtime), timeout=5
                    )
                    local_latencies.append((time.perf_counter() - start) * 1000)
                except grpc.RpcError:
                    local_errors += 1
        return local_latencies, local_errors

    actual_total = per_client * clients
    start_all = time.perf_counter()
    with ThreadPoolExecutor(max_workers=clients) as pool:
        futures = [pool.submit(worker) for _ in range(clients)]
        for future in as_completed(futures):
            values, failed = future.result()
            latencies.extend(values)
            errors += failed
    elapsed = time.perf_counter() - start_all

    success = len(latencies)
    throughput = success / elapsed if elapsed else 0
    avg_latency = statistics.mean(latencies) if latencies else 0
    p95 = sorted(latencies)[int(0.95 * (len(latencies) - 1))] if latencies else 0
    return {
        "clients": clients,
        "requests": actual_total,
        "success": success,
        "errors": errors,
        "total_seconds": round(elapsed, 4),
        "throughput_req_s": round(throughput, 2),
        "avg_latency_ms": round(avg_latency, 2),
        "p95_latency_ms": round(p95, 2),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", default=os.getenv("BIOSKOP_SERVER", "localhost:50051"))
    parser.add_argument("--showtime", default=os.getenv(
        "BIOSKOP_SHOWTIME", "FILM-001-2026-11-05-19:00"))
    parser.add_argument("--requests", type=int, default=200,
                        help="Jumlah permintaan per skenario dibagi rata ke client")
    args = parser.parse_args()

    results = []
    for clients in (1, 5, 20):
        print(f"Menjalankan {args.requests} request dengan {clients} client...")
        result = run_benchmark(args.server, args.showtime, clients, args.requests)
        results.append(result)
        print(result)

    with open("hasil_benchmark.csv", "w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)
    print("Hasil disimpan ke hasil_benchmark.csv")


if __name__ == "__main__":
    main()
