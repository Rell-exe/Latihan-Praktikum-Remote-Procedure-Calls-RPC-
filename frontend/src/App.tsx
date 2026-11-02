import { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { DateSelector } from './components/DateSelector';
import { MovieDetails } from './components/MovieDetails';
import { ShowtimeSelector } from './components/ShowtimeSelector';
import { SeatMap } from './components/SeatMap';
import { SelectedTickets } from './components/SelectedTickets';
import { BookingSummary } from './components/BookingSummary';
import { CheckoutDialog } from './components/CheckoutDialog';
import { BookingConfirmationModal } from './components/BookingConfirmationModal';
import { MyTicketsModal } from './components/MyTicketsModal';
import { ToastContainer } from './components/Toast';

import { fetchCatalog, fetchSeats, reserveSeats, cancelReservation } from './services/api';
import { SeatStreamSubscriber } from './services/websocket';
import type { CatalogResponse, Seat, ReservationResultItem, ToastMessage } from './types';

export function App() {
  // App Data & Configuration
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-18');
  const [selectedSlot, setSelectedSlot] = useState<string>('11:45');
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [systemVersion, setSystemVersion] = useState<number>(0);
  const [streamStatus, setStreamStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Client ID (UUID generated once and stored in localStorage)
  const [clientId] = useState<string>(() => {
    const saved = localStorage.getItem('cinereserve_client_id');
    if (saved) return saved;
    const newId = `client-${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem('cinereserve_client_id', newId);
    return newId;
  });

  // Modals & UI States
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [myTicketsOpen, setMyTicketsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [customerName, setCustomerName] = useState('Ahmad Rizky');
  const [lastSuccessfulBooking, setLastSuccessfulBooking] = useState<{
    seats: ReservationResultItem[];
    totalPrice: number;
  } | null>(null);

  // Active reservations tracker (stored in localStorage)
  const [activeReservations, setActiveReservations] = useState<ReservationResultItem[]>(() => {
    try {
      const saved = localStorage.getItem('cinereserve_active_reservations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const subscriberRef = useRef<SeatStreamSubscriber | null>(null);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Derive current showtime_id: FILM-001-YYYY-MM-DD-HH:MM
  const currentShowtimeId = useMemo(() => {
    return `FILM-001-${selectedDate}-${selectedSlot}`;
  }, [selectedDate, selectedSlot]);

  // Load Catalog on mount
  useEffect(() => {
    fetchCatalog()
      .then((data) => {
        setCatalog(data);
        if (data.defaultDate) setSelectedDate(data.defaultDate);
        if (data.defaultTime) setSelectedSlot(data.defaultTime);
      })
      .catch((err) => {
        console.error('Failed to load catalog', err);
        addToast('error', 'Koneksi Gateway Gagal', 'Pastikan FastAPI API Gateway sudah berjalan di port 8000.');
      });
  }, []);

  // Sync Seats and WebSocket whenever showtime changes
  useEffect(() => {
    if (!currentShowtimeId) return;

    // Bersihkan kursi terpilih saat jadwal berganti
    setSelectedSeatIds([]);

    // 1. Fetch initial snapshot from REST API
    fetchSeats(currentShowtimeId)
      .then((res) => {
        setSeats(res.kursi);
        setSystemVersion(res.version);
      })
      .catch((err) => {
        console.error('Error fetching seats', err);
        addToast('error', 'Gagal Mengambil Denah', err.message);
      });

    // 2. Setup WebSocket live streaming bridge from gRPC
    if (subscriberRef.current) {
      subscriberRef.current.disconnect();
    }

    subscriberRef.current = new SeatStreamSubscriber(
      currentShowtimeId,
      (updatedData) => {
        setSeats(updatedData.kursi);
        setSystemVersion(updatedData.version);

        // Check for race condition: did someone else book a seat we currently have selected?
        setSelectedSeatIds((prevSelected) => {
          const bookedMap = new Set(
            updatedData.kursi.filter((s) => s.status === 'BOOKED').map((s) => s.seat_id)
          );
          const conflicts = prevSelected.filter((id) => bookedMap.has(id));

          if (conflicts.length > 0) {
            addToast(
              'warning',
              'Perubahan Kursi Real-Time',
              `Kursi [${conflicts.join(', ')}] baru saja dipesan oleh pengguna lain dan dihapus dari pilihan Anda.`
            );
            return prevSelected.filter((id) => !bookedMap.has(id));
          }
          return prevSelected;
        });
      },
      (status) => {
        setStreamStatus(status);
      }
    );

    return () => {
      subscriberRef.current?.disconnect();
    };
  }, [currentShowtimeId]);

  // Save active reservations to localStorage
  useEffect(() => {
    localStorage.setItem('cinereserve_active_reservations', JSON.stringify(activeReservations));
  }, [activeReservations]);

  // Seat click toggle handler
  const handleToggleSeat = (seatId: string) => {
    if (selectedSeatIds.includes(seatId)) {
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seatId));
    } else {
      setSelectedSeatIds((prev) => [...prev, seatId]);
    }
  };

  const handleRemoveSeat = (seatId: string) => {
    setSelectedSeatIds((prev) => prev.filter((id) => id !== seatId));
  };

  // Submit reservations to gRPC backend via Gateway
  const handleConfirmReservation = async (name: string) => {
    if (!catalog || selectedSeatIds.length === 0) return;
    setIsSubmitting(true);
    setCustomerName(name);

    try {
      const response = await reserveSeats({
        showtime_id: currentShowtimeId,
        nama_pemesan: name,
        client_id: clientId,
        seats: selectedSeatIds,
      });

      const successful = response.results.filter((r) => r.sukses);
      const failed = response.results.filter((r) => !r.sukses);

      if (successful.length > 0) {
        // Add to active reservations list
        setActiveReservations((prev) => [...prev, ...successful]);
        setLastSuccessfulBooking({
          seats: successful,
          totalPrice: successful.length * catalog.movie.pricePerSeat,
        });

        setCheckoutOpen(false);
        setConfirmationOpen(true);
        setSelectedSeatIds([]);

        addToast(
          'success',
          'Pemesanan Berhasil!',
          `${successful.length} tiket berhasil diproses via gRPC PesanKursi.`
        );
      }

      if (failed.length > 0) {
        addToast(
          'error',
          'Sebagian Tiket Gagal',
          `${failed.map((f) => `${f.seat_id}: ${f.pesan}`).join('; ')}`
        );
      }
    } catch (err: any) {
      console.error('Reservation exception', err);
      addToast('error', 'Gagal Memproses Reservasi', err.message || 'Kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel reservation via gRPC BatalkanReservasi
  const handleCancelReservation = async (reservationId: string) => {
    setIsCancelling(true);
    try {
      const res = await cancelReservation({
        reservation_id: reservationId,
        client_id: clientId,
      });

      if (res.sukses) {
        setActiveReservations((prev) => prev.filter((r) => r.reservation_id !== reservationId));
        addToast('info', 'Reservasi Dibatalkan', res.pesan);
      } else {
        addToast('error', 'Gagal Membatalkan', res.pesan);
      }
    } catch (err: any) {
      addToast('error', 'Error BatalkanReservasi', err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const currentSlotObj = catalog?.timeSlots.find((s) => s.slot === selectedSlot);
  const showtimeLabel = currentSlotObj ? `${currentSlotObj.label} (${currentSlotObj.format})` : selectedSlot;

  if (!catalog) {
    return (
      <div className="min-h-screen bg-[#07111F] flex flex-col items-center justify-center text-[#F5F7FA] p-4">
        <div className="w-12 h-12 border-4 border-[#159BFA]/30 border-t-[#159BFA] rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold tracking-tight">Memuat CineReserve...</h2>
        <p className="text-xs text-[#929DAD] mt-1">Menghubungkan ke FastAPI Gateway & gRPC Server</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F5F7FA] flex flex-col justify-between selection:bg-[#159BFA] selection:text-white">
      {/* Toast Notification Layer */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Main Container: Max 1440px Centered */}
      <div className="w-full max-w-[1440px] mx-auto min-h-screen flex flex-col px-2 sm:px-6 lg:px-8 py-3 sm:py-6">
        <div className="w-full bg-[#0D1726] border border-[#1A2638] rounded-[28px] sm:rounded-[36px] shadow-2xl overflow-hidden flex flex-col flex-1">
          {/* Header Navigation */}
          <Header
            activeReservationsCount={activeReservations.length}
            onOpenMyTickets={() => setMyTicketsOpen(true)}
            clientId={clientId}
          />

          {/* Date Selector Navigation */}
          <DateSelector
            dates={catalog.dates}
            selectedDate={selectedDate}
            onSelectDate={(d) => setSelectedDate(d)}
          />

          {/* Main Content: 2-Column Desktop Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 p-4 sm:p-6 lg:p-8 gap-8 items-stretch">
            {/* LEFT PANEL: Movie Information, Showtime, Tickets & Checkout */}
            <div className="lg:col-span-5 flex flex-col justify-between pr-0 lg:pr-6 border-b lg:border-b-0 lg:border-r border-[#1A2638] pb-6 lg:pb-0">
              <div className="space-y-4">
                {/* Movie Details */}
                <MovieDetails movie={catalog.movie} />

                {/* Selected Time Slots */}
                <ShowtimeSelector
                  timeSlots={catalog.timeSlots}
                  selectedSlot={selectedSlot}
                  onSelectSlot={(slot) => setSelectedSlot(slot)}
                />

                {/* Selected Tickets Chip List */}
                <SelectedTickets
                  selectedSeatIds={selectedSeatIds}
                  pricePerSeat={catalog.movie.pricePerSeat}
                  onRemoveSeat={handleRemoveSeat}
                />
              </div>

              {/* Pricing & BUY Button */}
              <BookingSummary
                selectedCount={selectedSeatIds.length}
                pricePerSeat={catalog.movie.pricePerSeat}
                onProceedToCheckout={() => setCheckoutOpen(true)}
                isLoading={isSubmitting}
              />
            </div>

            {/* RIGHT PANEL: Interactive Cinema Seat Map */}
            <div className="lg:col-span-7 flex flex-col justify-between pl-0 lg:pl-6">
              <SeatMap
                seats={seats}
                selectedSeatIds={selectedSeatIds}
                onToggleSeat={handleToggleSeat}
                streamStatus={streamStatus}
                version={systemVersion}
              />

              {/* Bottom Info Bar */}
              <div className="mt-8 pt-4 border-t border-[#1A2638] flex flex-wrap items-center justify-between gap-3 text-xs text-[#929DAD]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Showtime ID: <code className="text-[#F5F7FA] font-mono text-[11px] bg-[#111F30] px-1.5 py-0.5 rounded">{currentShowtimeId}</code></span>
                </div>
                <div>
                  Venue: <span className="text-[#F5F7FA] font-semibold">{catalog.movie.venue}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <footer className="text-center py-4 text-xs text-[#929DAD]/60 flex items-center justify-center gap-4">
          <span>CineReserve © 2026 • Komputasi Paralel & Terdistribusi</span>
          <span>•</span>
          <span>gRPC + Protobuf + FastAPI Gateway</span>
        </footer>
      </div>

      {/* Checkout Dialog Modal */}
      <CheckoutDialog
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        selectedSeats={selectedSeatIds}
        movie={catalog.movie}
        showtimeDate={selectedDate}
        showtimeLabel={showtimeLabel}
        pricePerSeat={catalog.movie.pricePerSeat}
        clientId={clientId}
        onConfirmReservation={handleConfirmReservation}
        isSubmitting={isSubmitting}
      />

      {/* Booking Success Confirmation & E-Ticket Modal (Page 2) */}
      {lastSuccessfulBooking && (
        <BookingConfirmationModal
          isOpen={confirmationOpen}
          onClose={() => setConfirmationOpen(false)}
          customerName={customerName}
          movie={catalog.movie}
          showtimeDate={selectedDate}
          showtimeLabel={showtimeLabel}
          successfulSeats={lastSuccessfulBooking.seats}
          totalPrice={lastSuccessfulBooking.totalPrice}
          clientId={clientId}
        />
      )}

      {/* Active Booked Tickets Modal */}
      <MyTicketsModal
        isOpen={myTicketsOpen}
        onClose={() => setMyTicketsOpen(false)}
        reservations={activeReservations}
        onCancelReservation={handleCancelReservation}
        isCancelling={isCancelling}
      />
    </div>
  );
}

export default App;
