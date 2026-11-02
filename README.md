# Latihan-Praktikum-Remote-Procedure-Calls-RPC-
Studi Kasus Reservasi tiket bioskop

## Sistem Terdistribusi Reservasi Tiket Bioskop Berbasis gRPC

Proyek mini mata kuliah Komputasi Paralel dan Terdistribusi. Implementasi menggunakan Python 3.10+, gRPC, Protocol Buffers, SQLite, dan Docker.

## 1. Fitur

- `PesanKursi`: Unary RPC untuk memesan satu kursi.
- `StreamStatusKursi`: server streaming untuk mengirim snapshot awal dan pembaruan status kursi.
- `GetDenahKursi`: Unary RPC untuk mengambil denah kursi.
- `BatalkanReservasi`: Unary RPC untuk membatalkan reservasi aktif.
- `HealthCheck`: Unary RPC untuk memeriksa layanan.
- Proteksi race condition menggunakan transaksi SQLite `BEGIN IMMEDIATE`.
- Deduplikasi request menggunakan UUID dan fingerprint payload.
- Timeout dan retry dengan exponential backoff; retry memakai UUID yang sama.
- Uji race condition 20 client dan benchmark 1, 5, serta 20 client.
- Database persisten melalui volume Docker.

## 2. Struktur folder

```text
Proyek_RPC_Reservasi_Bioskop/
├── proto/bioskop.proto
├── server.py
├── client.py
├── benchmark.py
├── tests/test_race.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── README.md
└── docs/
```

## 3. Instalasi lokal (Windows)

Pastikan Python 3.10 atau lebih baru terpasang. Buka terminal pada folder proyek.

```powershell
python --version
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m grpc_tools.protoc -I proto --python_out=. --grpc_python_out=. proto/bioskop.proto
```

Perintah generate menghasilkan `bioskop_pb2.py` dan `bioskop_pb2_grpc.py`. Kedua file ini dibuat otomatis dan tidak perlu diedit manual.

## 4. Menjalankan server dan client

Terminal 1:

```powershell
python server.py
```

Terminal 2:

```powershell
python client.py
```

Jadwal demo bawaan: `FILM-001-2026-11-05-19:00`. Denah terdiri dari kursi A01 sampai E08. Jadwal dan kursi contoh dibuat otomatis ketika database pertama kali diinisialisasi.

## 5. Demo pada dua komputer

### Komputer server
1. Jalankan server dengan `python server.py` atau `docker compose up --build`.
2. Cari alamat IPv4 komputer server melalui `ipconfig`.
3. Pastikan firewall mengizinkan koneksi TCP masuk pada port 50051.
4. Jika menggunakan Docker, port 50051 harus dipublikasikan seperti konfigurasi compose.

### Komputer client
1. Salin folder proyek ke komputer client.
2. Buat virtual environment, install requirements, dan generate stub dengan langkah instalasi di atas.
3. Atur alamat server, misalnya pada PowerShell:

```powershell
$env:BIOSKOP_SERVER="192.168.1.10:50051"
python client.py
```

Ganti alamat contoh dengan IPv4 komputer server. Jangan gunakan `localhost` pada komputer client karena `localhost` menunjuk ke komputer client itu sendiri.

## 6. Uji race condition

Pastikan server aktif, lalu jalankan:

```powershell
python tests/test_race.py
```

Secara default 20 client mencoba memesan kursi E08 pada jadwal yang sama. Hasil yang diharapkan: tepat satu client berhasil dan 19 client ditolak. Untuk mengulang pengujian, pilih kursi lain yang masih tersedia atau reset database saat server dimatikan.

## 7. Uji kinerja

```powershell
python benchmark.py --requests 200
```

Program menguji 1, 5, dan 20 client bersamaan. Hasil disimpan di `hasil_benchmark.csv`. Catat hasil aktual ke laporan. Jangan mengisi tabel dengan angka perkiraan.

Metrik:
- Throughput = jumlah RPC sukses / waktu total (request per detik).
- Latensi rata-rata = jumlah latensi tiap RPC / jumlah RPC sukses.
- P95 = latensi yang berada pada persentil ke-95.

Benchmark memakai `GetDenahKursi` yang bersifat read-only agar hasil pengukuran tidak dipengaruhi konflik perebutan satu kursi. Jalankan pengujian pada perangkat dan jaringan yang sama untuk membandingkan skenario secara adil.

## 8. Pengujian server streaming

1. Jalankan `python client.py` pada dua terminal/client.
2. Pada client pertama pilih menu 3 untuk memantau status kursi.
3. Pada client kedua pesan kursi yang tersedia.
4. Client pertama akan menerima snapshot awal dan update versi terbaru setelah perubahan terdeteksi.

Streaming dibatasi 60 detik secara default dari client demo. Server mengirim update ketika versi atau isi status kursi berubah, bukan mengirim pesan identik terus-menerus.

## 9. Reset database demo

Matikan server terlebih dahulu. Hapus `data/bioskop.db` (serta file `-wal` dan `-shm` jika ada), kemudian jalankan server lagi. Untuk Docker, penghapusan volume akan menghapus data persisten:

```powershell
docker compose down -v
```

Perhatian: reset database hanya untuk pengujian, bukan penggunaan produksi.

## 10. Catatan desain dan batasan

- SQLite `BEGIN IMMEDIATE` mengunci transaksi penulis sehingga pemeriksaan kursi dan perubahan status berlangsung atomik. Constraint primary key pada `(showtime_id, seat_id)` juga mencegah duplikasi kursi pada jadwal yang sama.
- UUID dan tabel `request_dedup` memastikan retry dengan request ID serta payload yang sama mengembalikan hasil terdahulu, bukan membuat reservasi baru.
- Jika client memakai request ID yang sama untuk payload berbeda, server menolak permintaan.
- SQLite cocok untuk demonstrasi dan beban proyek mini. Sistem produksi multi-server dengan trafik tinggi sebaiknya menggunakan database server seperti PostgreSQL, koneksi TLS, autentikasi, otorisasi, kebijakan retensi deduplikasi, dan observabilitas.
- Contoh ini menggunakan `insecure_channel` untuk praktikum di jaringan lokal tepercaya. Jangan mengekspos layanan tanpa TLS dan autentikasi ke internet.
- Jadwal tayang demo dibuat statis saat inisialisasi. Pengembangan lanjutan dapat menambahkan RPC pengelolaan film dan jadwal.

## 11. Git

```bash
git init
git add .
git commit -m "feat: implement gRPC cinema reservation service"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPOSITORY.git
git push -u origin main
```

Setiap anggota kelompok sebaiknya membuat commit atas kontribusi masing-masing. Ganti URL remote dengan repositori kelompok.

## 12. Video demo maksimal 5 menit

Urutan yang disarankan:
1. Tampilkan arsitektur dan kontrak `.proto`.
2. Jalankan server dan dua client.
3. Tunjukkan denah kursi dan Unary `PesanKursi`.
4. Aktifkan streaming pada client pertama, lalu pesan kursi dari client kedua.
5. Jalankan `tests/test_race.py` dan tunjukkan satu pemenang.
6. Jalankan benchmark dan tampilkan CSV.
7. Jelaskan timeout, retry, UUID deduplikasi, dan hasil pengujian.
