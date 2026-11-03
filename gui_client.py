import os
import sys
import threading
import time
import uuid
import tkinter as tk
from tkinter import ttk, messagebox

import grpc
import bioskop_pb2 as pb
import bioskop_pb2_grpc as pb_grpc

DEFAULT_SERVER = sys.argv[1] if len(sys.argv) > 1 else os.getenv("BIOSKOP_SERVER", "172.20.10.2:50051")
if ":" not in DEFAULT_SERVER:
    DEFAULT_SERVER = f"{DEFAULT_SERVER}:50051"

DEFAULT_SHOWTIME = os.getenv("BIOSKOP_SHOWTIME", "FILM-001-2026-11-05-19:00")
CLIENT_ID = os.getenv("BIOSKOP_CLIENT_ID", f"gui-{uuid.uuid4().hex[:6]}")


class CineReserveGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("CineReserve - Client GUI (gRPC)")
        self.root.geometry("980x750")
        self.root.minsize(850, 650)
        self.root.configure(bg="#181825")

        self.channel = None
        self.stub = None
        self.streaming_active = False
        self.stream_thread = None

        self.selected_seat = None
        self.seat_buttons = {}  # seat_id -> tk.Button
        self.seat_statuses = {}  # seat_id -> status

        self._setup_styles()
        self._build_ui()

        # Auto-connect on startup
        self.root.after(200, self.connect_server)

    def _setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TLabel", background="#181825", foreground="#CDD6F4", font=("Segoe UI", 10))
        style.configure("TButton", font=("Segoe UI", 10, "bold"))
        style.configure("Header.TLabel", font=("Segoe UI", 16, "bold"), foreground="#89B4FA")
        style.configure("Status.TLabel", font=("Segoe UI", 9), foreground="#A6ADC8")

    def _build_ui(self):
        # Header Frame
        top_frame = tk.Frame(self.root, bg="#1E1E2E", padx=15, pady=12)
        top_frame.pack(fill="x", side="top")

        lbl_title = tk.Label(
            top_frame,
            text="🎬 CineReserve - Reservasi Tiket Bioskop (gRPC GUI)",
            font=("Segoe UI", 15, "bold"),
            bg="#1E1E2E",
            fg="#89B4FA",
        )
        lbl_title.pack(side="left")

        self.lbl_client_id = tk.Label(
            top_frame,
            text=f"ID: {CLIENT_ID}",
            font=("Segoe UI", 9),
            bg="#1E1E2E",
            fg="#6C7086",
        )
        self.lbl_client_id.pack(side="right", padx=5)

        # Connection & Showtime Bar
        conn_frame = tk.Frame(self.root, bg="#181825", padx=15, pady=10)
        conn_frame.pack(fill="x")

        tk.Label(conn_frame, text="Server IP:", bg="#181825", fg="#CDD6F4", font=("Segoe UI", 10, "bold")).pack(side="left")
        self.entry_server = tk.Entry(conn_frame, font=("Segoe UI", 10), width=22, bg="#313244", fg="#FFFFFF", insertbackground="white")
        self.entry_server.insert(0, DEFAULT_SERVER)
        self.entry_server.pack(side="left", padx=(6, 12))

        self.btn_connect = tk.Button(
            conn_frame,
            text="Hubungkan",
            command=self.connect_server,
            bg="#89B4FA",
            fg="#11111B",
            font=("Segoe UI", 9, "bold"),
            relief="flat",
            padx=10,
            pady=3,
            cursor="hand2",
        )
        self.btn_connect.pack(side="left", padx=(0, 15))

        self.lbl_conn_status = tk.Label(
            conn_frame,
            text="🔴 Belum Terhubung",
            bg="#181825",
            fg="#F38BA8",
            font=("Segoe UI", 10, "bold"),
        )
        self.lbl_conn_status.pack(side="left", padx=5)

        tk.Label(conn_frame, text="Jadwal:", bg="#181825", fg="#CDD6F4", font=("Segoe UI", 10, "bold")).pack(side="left", padx=(25, 6))
        self.entry_showtime = tk.Entry(conn_frame, font=("Segoe UI", 9), width=28, bg="#313244", fg="#FFFFFF", insertbackground="white")
        self.entry_showtime.insert(0, DEFAULT_SHOWTIME)
        self.entry_showtime.pack(side="left")

        self.btn_refresh = tk.Button(
            conn_frame,
            text="🔄 Refresh",
            command=self.load_seat_map,
            bg="#45475A",
            fg="#CDD6F4",
            font=("Segoe UI", 9),
            relief="flat",
            padx=8,
            pady=3,
            cursor="hand2",
        )
        self.btn_refresh.pack(side="left", padx=(10, 0))

        # Main Body (Split into Left: SeatMap, Right: Action Panel)
        body_frame = tk.Frame(self.root, bg="#181825", padx=15, pady=5)
        body_frame.pack(fill="both", expand=True)

        # Left Frame: Screen & Seats
        left_frame = tk.Frame(body_frame, bg="#1E1E2E", padx=15, pady=15, relief="flat", bd=1)
        left_frame.pack(side="left", fill="both", expand=True, padx=(0, 10))

        # Screen representation
        screen_frame = tk.Frame(left_frame, bg="#313244", height=28)
        screen_frame.pack(fill="x", pady=(0, 12))
        lbl_screen = tk.Label(
            screen_frame,
            text="───────────  L A Y A R   B I O S K O P  ───────────",
            font=("Segoe UI", 10, "bold"),
            bg="#45475A",
            fg="#BAC2DE",
            pady=4,
        )
        lbl_screen.pack(fill="x")

        # Scrollable Seat Container
        self.seat_canvas = tk.Canvas(left_frame, bg="#1E1E2E", highlightthickness=0)
        self.seat_scrollbar = tk.Scrollbar(left_frame, orient="vertical", command=self.seat_canvas.yview)
        self.seat_inner_frame = tk.Frame(self.seat_canvas, bg="#1E1E2E")

        self.seat_inner_frame.bind(
            "<Configure>",
            lambda e: self.seat_canvas.configure(scrollregion=self.seat_canvas.bbox("all")),
        )
        self.seat_canvas.create_window((0, 0), window=self.seat_inner_frame, anchor="nw")
        self.seat_canvas.configure(yscrollcommand=self.seat_scrollbar.set)

        self.seat_canvas.pack(side="left", fill="both", expand=True)
        self.seat_scrollbar.pack(side="right", fill="y")

        # Legend Bar
        legend_frame = tk.Frame(left_frame, bg="#1E1E2E", pady=8)
        legend_frame.pack(fill="x", side="bottom")

        self._create_legend_item(legend_frame, "#A6E3A1", "#11111B", "Tersedia")
        self._create_legend_item(legend_frame, "#F9E2AF", "#11111B", "Dipilih")
        self._create_legend_item(legend_frame, "#F38BA8", "#11111B", "Terisi")

        # Right Frame: Booking & Management Panel
        right_frame = tk.Frame(body_frame, bg="#1E1E2E", width=300, padx=18, pady=18, relief="flat")
        right_frame.pack(side="right", fill="y")
        right_frame.pack_propagate(False)

        # Booking Section
        tk.Label(
            right_frame,
            text="Pemesanan Kursi",
            font=("Segoe UI", 12, "bold"),
            bg="#1E1E2E",
            fg="#89B4FA",
        ).pack(anchor="w", pady=(0, 10))

        tk.Label(right_frame, text="Kursi Terpilih:", bg="#1E1E2E", fg="#A6ADC8", font=("Segoe UI", 9)).pack(anchor="w")
        self.lbl_selected_seat = tk.Label(
            right_frame,
            text="Belum ada",
            font=("Segoe UI", 14, "bold"),
            bg="#313244",
            fg="#F9E2AF",
            pady=6,
            relief="flat",
        )
        self.lbl_selected_seat.pack(fill="x", pady=(3, 12))

        tk.Label(right_frame, text="Nama Pemesan:", bg="#1E1E2E", fg="#A6ADC8", font=("Segoe UI", 9)).pack(anchor="w")
        self.entry_nama = tk.Entry(
            right_frame,
            font=("Segoe UI", 11),
            bg="#313244",
            fg="#FFFFFF",
            insertbackground="white",
            relief="flat",
        )
        self.entry_nama.pack(fill="x", pady=(3, 14), ipady=4)

        self.btn_pesan = tk.Button(
            right_frame,
            text="🎟️ Pesan Kursi",
            command=self.pesan_kursi,
            bg="#A6E3A1",
            fg="#11111B",
            font=("Segoe UI", 11, "bold"),
            relief="flat",
            pady=8,
            cursor="hand2",
        )
        self.btn_pesan.pack(fill="x", pady=(0, 20))

        # Separator
        tk.Frame(right_frame, bg="#45475A", height=1).pack(fill="x", pady=10)

        # Cancellation Section
        tk.Label(
            right_frame,
            text="Batalkan Reservasi",
            font=("Segoe UI", 12, "bold"),
            bg="#1E1E2E",
            fg="#F38BA8",
        ).pack(anchor="w", pady=(5, 10))

        tk.Label(right_frame, text="ID Reservasi:", bg="#1E1E2E", fg="#A6ADC8", font=("Segoe UI", 9)).pack(anchor="w")
        self.entry_res_id = tk.Entry(
            right_frame,
            font=("Segoe UI", 10),
            bg="#313244",
            fg="#FFFFFF",
            insertbackground="white",
            relief="flat",
        )
        self.entry_res_id.pack(fill="x", pady=(3, 10), ipady=3)

        self.btn_batal = tk.Button(
            right_frame,
            text="❌ Batalkan",
            command=self.batalkan_reservasi,
            bg="#F38BA8",
            fg="#11111B",
            font=("Segoe UI", 10, "bold"),
            relief="flat",
            pady=6,
            cursor="hand2",
        )
        self.btn_batal.pack(fill="x", pady=(0, 15))

        # Bottom Log Label
        self.lbl_log = tk.Label(
            right_frame,
            text="Siap terhubung.",
            bg="#1E1E2E",
            fg="#6C7086",
            font=("Segoe UI", 8),
            wraplength=260,
            justify="left",
        )
        self.lbl_log.pack(side="bottom", fill="x", pady=5)

    def _create_legend_item(self, parent, bg, fg, label):
        frame = tk.Frame(parent, bg="#1E1E2E")
        frame.pack(side="left", padx=10)
        box = tk.Label(frame, text="  ", bg=bg, width=3, relief="flat")
        box.pack(side="left", padx=(0, 5))
        txt = tk.Label(frame, text=label, bg="#1E1E2E", fg="#CDD6F4", font=("Segoe UI", 9))
        txt.pack(side="left")

    def connect_server(self):
        target = self.entry_server.get().strip()
        if not target:
            target = DEFAULT_SERVER
        if ":" not in target:
            target = f"{target}:50051"

        self.lbl_conn_status.config(text="🟡 Menghubungkan...", fg="#F9E2AF")
        self.root.update_idletasks()

        try:
            if self.channel:
                self.channel.close()
            self.channel = grpc.insecure_channel(target)
            grpc.channel_ready_future(self.channel).result(timeout=4)
            self.stub = pb_grpc.ReservasiBioskopStub(self.channel)

            health = self.stub.HealthCheck(pb.HealthRequest(), timeout=3)
            self.lbl_conn_status.config(text=f"🟢 Terhubung ({target})", fg="#A6E3A1")
            self.lbl_log.config(text=f"Health: {health.pesan}", fg="#A6E3A1")

            self.load_seat_map()
            self.start_streaming()

        except Exception as e:
            self.lbl_conn_status.config(text="🔴 Gagal Terhubung", fg="#F38BA8")
            self.lbl_log.config(text=f"Error: {e}", fg="#F38BA8")

    def load_seat_map(self):
        if not self.stub:
            messagebox.showwarning("Peringatan", "Belum terhubung ke server.")
            return

        showtime = self.entry_showtime.get().strip()
        try:
            res = self.stub.GetDenahKursi(pb.DenahKursiRequest(showtime_id=showtime), timeout=4)
            self.render_seats(res.kursi)
            self.lbl_log.config(text=f"Denah diperbarui (Versi: {res.version})", fg="#89B4FA")
        except Exception as e:
            self.lbl_log.config(text=f"Gagal memuat denah: {e}", fg="#F38BA8")

    def render_seats(self, kursi_list):
        # Clear existing buttons
        for widget in self.seat_inner_frame.winfo_children():
            widget.destroy()
        self.seat_buttons.clear()
        self.seat_statuses.clear()

        # Group seats by row
        rows = {}
        for k in kursi_list:
            row_letter = k.seat_id[0] if k.seat_id else "?"
            rows.setdefault(row_letter, []).append(k)

        for row_letter in sorted(rows.keys()):
            r_frame = tk.Frame(self.seat_inner_frame, bg="#1E1E2E", pady=3)
            r_frame.pack(anchor="center")

            # Row label
            lbl_row = tk.Label(
                r_frame,
                text=row_letter,
                font=("Segoe UI", 10, "bold"),
                bg="#1E1E2E",
                fg="#89B4FA",
                width=3,
            )
            lbl_row.pack(side="left", padx=5)

            # Sort seats in row
            sorted_seats = sorted(rows[row_letter], key=lambda x: x.seat_id)
            for idx, seat in enumerate(sorted_seats):
                # Add walkway in middle (after seat 4 or 8)
                if idx in (4, 8, 12):
                    spacer = tk.Label(r_frame, text="", bg="#1E1E2E", width=2)
                    spacer.pack(side="left")

                is_booked = (seat.status == "BOOKED")
                bg_color = "#F38BA8" if is_booked else "#A6E3A1"
                fg_color = "#11111B"
                state = "disabled" if is_booked else "normal"

                btn = tk.Button(
                    r_frame,
                    text=seat.seat_id[1:],  # Show column number like "01"
                    font=("Segoe UI", 8, "bold"),
                    bg=bg_color,
                    fg=fg_color,
                    activebackground="#F9E2AF",
                    width=3,
                    height=1,
                    relief="flat",
                    state=state,
                    cursor="hand2" if not is_booked else "arrow",
                    command=lambda sid=seat.seat_id: self.select_seat(sid),
                )
                btn.pack(side="left", padx=2, pady=1)

                self.seat_buttons[seat.seat_id] = btn
                self.seat_statuses[seat.seat_id] = seat.status

    def select_seat(self, seat_id):
        # Deselect old seat
        if self.selected_seat and self.selected_seat in self.seat_buttons:
            old_status = self.seat_statuses.get(self.selected_seat, "AVAILABLE")
            if old_status == "AVAILABLE":
                self.seat_buttons[self.selected_seat].config(bg="#A6E3A1", fg="#11111B")

        self.selected_seat = seat_id
        if seat_id in self.seat_buttons:
            self.seat_buttons[seat_id].config(bg="#F9E2AF", fg="#11111B")

        self.lbl_selected_seat.config(text=seat_id)

    def pesan_kursi(self):
        if not self.stub:
            messagebox.showwarning("Peringatan", "Belum terhubung ke server.")
            return

        if not self.selected_seat:
            messagebox.showwarning("Peringatan", "Silakan klik dan pilih nomor kursi terlebih dahulu.")
            return

        nama = self.entry_nama.get().strip()
        if not nama:
            messagebox.showwarning("Peringatan", "Silakan masukkan nama pemesan.")
            return

        showtime = self.entry_showtime.get().strip()
        request_id = str(uuid.uuid4())
        req = pb.PesanKursiRequest(
            request_id=request_id,
            client_id=CLIENT_ID,
            showtime_id=showtime,
            seat_id=self.selected_seat,
            nama_pemesan=nama,
        )

        try:
            res = self.stub.PesanKursi(req, timeout=4)
            if res.sukses:
                messagebox.showinfo(
                    "Pemesanan Berhasil!",
                    f"Kursi {self.selected_seat} berhasil dipesan!\n\n"
                    f"Nama: {nama}\n"
                    f"ID Reservasi: {res.reservation_id}\n\n"
                    f"Simpan ID Reservasi ini untuk pembatalan.",
                )
                self.entry_res_id.delete(0, tk.END)
                self.entry_res_id.insert(0, res.reservation_id)
                self.selected_seat = None
                self.lbl_selected_seat.config(text="Belum ada")
                self.load_seat_map()
            else:
                messagebox.showerror("Gagal Memesan", f"Pesan gagal: {res.pesan}")
        except Exception as e:
            messagebox.showerror("RPC Error", f"Terjadi kesalahan gRPC:\n{e}")

    def batalkan_reservasi(self):
        if not self.stub:
            messagebox.showwarning("Peringatan", "Belum terhubung ke server.")
            return

        res_id = self.entry_res_id.get().strip()
        if not res_id:
            messagebox.showwarning("Peringatan", "Masukkan ID Reservasi yang ingin dibatalkan.")
            return

        if not messagebox.askyesno("Konfirmasi", f"Yakin ingin membatalkan reservasi '{res_id}'?"):
            return

        req = pb.BatalkanReservasiRequest(
            request_id=str(uuid.uuid4()),
            client_id=CLIENT_ID,
            reservation_id=res_id,
        )

        try:
            res = self.stub.BatalkanReservasi(req, timeout=4)
            if res.sukses:
                messagebox.showinfo("Berhasil", f"Reservasi berhasil dibatalkan:\n{res.pesan}")
                self.entry_res_id.delete(0, tk.END)
                self.load_seat_map()
            else:
                messagebox.showerror("Gagal", f"Gagal membatalkan: {res.pesan}")
        except Exception as e:
            messagebox.showerror("RPC Error", f"Terjadi kesalahan gRPC:\n{e}")

    def start_streaming(self):
        if self.streaming_active:
            return
        self.streaming_active = True
        self.stream_thread = threading.Thread(target=self._stream_loop, daemon=True)
        self.stream_thread.start()

    def _stream_loop(self):
        while self.streaming_active and self.stub:
            showtime = self.entry_showtime.get().strip()
            try:
                updates = self.stub.StreamStatusKursi(
                    pb.StreamStatusRequest(showtime_id=showtime, max_duration_seconds=60),
                    timeout=65,
                )
                for update in updates:
                    if not self.streaming_active:
                        break
                    self.root.after(0, self._apply_stream_update, update)
            except Exception:
                time.sleep(3)

    def _apply_stream_update(self, update):
        for k in update.kursi:
            sid = k.seat_id
            self.seat_statuses[sid] = k.status
            if sid in self.seat_buttons:
                btn = self.seat_buttons[sid]
                if k.status == "BOOKED":
                    btn.config(bg="#F38BA8", fg="#11111B", state="disabled", cursor="arrow")
                    if self.selected_seat == sid:
                        self.selected_seat = None
                        self.lbl_selected_seat.config(text="Belum ada")
                else:
                    if self.selected_seat != sid:
                        btn.config(bg="#A6E3A1", fg="#11111B", state="normal", cursor="hand2")
        self.lbl_log.config(text=f"Live Update v{update.version} at {update.server_time[-8:]}", fg="#89B4FA")


if __name__ == "__main__":
    root = tk.Tk()
    app = CineReserveGUI(root)
    root.mainloop()

