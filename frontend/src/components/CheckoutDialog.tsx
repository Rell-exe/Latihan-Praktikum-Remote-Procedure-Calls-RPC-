import React, { useState } from 'react';
import { X, User, Ticket, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { Movie } from '../types';

interface CheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSeats: string[];
  movie: Movie;
  showtimeLabel: string;
  showtimeDate: string;
  pricePerSeat: number;
  clientId: string;
  onConfirmReservation: (customerName: string) => Promise<void>;
  isSubmitting: boolean;
}

export const CheckoutDialog: React.FC<CheckoutDialogProps> = ({
  isOpen,
  onClose,
  selectedSeats,
  movie,
  showtimeLabel,
  showtimeDate,
  pricePerSeat,
  clientId,
  onConfirmReservation,
  isSubmitting,
}) => {
  const [customerName, setCustomerName] = useState('Ahmad Rizky');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const totalPrice = selectedSeats.length * pricePerSeat;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError('Nama pemesan wajib diisi.');
      return;
    }
    setError('');
    await onConfirmReservation(customerName.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0D1726] border border-[#1A2638] rounded-3xl shadow-2xl overflow-hidden p-6 text-[#F5F7FA]">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-[#929DAD] hover:text-white hover:bg-[#111F30] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#159BFA]/20 border border-[#159BFA]/40 text-[#159BFA] flex items-center justify-center">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Booking Details</h2>
            <p className="text-xs text-[#929DAD]">Selesaikan data untuk memesan tiket</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Order Summary Box */}
          <div className="p-3.5 rounded-2xl bg-[#111F30] border border-[#1A2638] text-xs flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-[#929DAD]">Film:</span>
              <span className="font-semibold text-right text-[#F5F7FA]">{movie.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#929DAD]">Jadwal:</span>
              <span className="font-medium text-[#F5F7FA]">{showtimeDate} • {showtimeLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#929DAD]">Kursi Dipilih:</span>
              <span className="font-bold text-[#159BFA]">{selectedSeats.join(', ')} ({selectedSeats.length} tiket)</span>
            </div>
            <div className="flex justify-between border-t border-[#1A2638] pt-2 font-bold">
              <span className="text-[#929DAD]">Total Bayar:</span>
              <span className="text-emerald-400 text-sm">{formatRupiah(totalPrice)}</span>
            </div>
          </div>

          {/* Customer Name */}
          <div>
            <label className="text-xs font-semibold text-[#929DAD] mb-1.5 block">
              Nama Lengkap Pemesan *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#929DAD] absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (error) setError('');
                }}
                disabled={isSubmitting}
                placeholder="Masukkan nama pemesan..."
                className="w-full bg-[#07111F] border border-[#1A2638] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#F5F7FA] focus:outline-none focus:border-[#159BFA] transition-colors"
              />
            </div>
            {error && <span className="text-[11px] text-rose-400 mt-1 block">{error}</span>}
          </div>

          {/* Client ID info */}
          <div className="p-2.5 rounded-xl bg-[#07111F] border border-[#1A2638] text-[11px] text-[#929DAD] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#159BFA]" />
              gRPC Client UUID:
            </span>
            <span className="font-mono text-[#F5F7FA] text-[10px]">{clientId}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/20 text-[10px] text-blue-200/80 leading-relaxed">
            * Setiap kursi akan dipesan secara atomic menggunakan Unary RPC <code className="text-white bg-blue-900/50 px-1 rounded">PesanKursi</code> dengan UUID deduplikasi untuk mencegah race condition.
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isSubmitting
                ? 'bg-[#159BFA]/70 text-white cursor-wait'
                : 'bg-[#159BFA] text-white hover:bg-[#188fe4] shadow-lg shadow-[#159BFA]/30 glow-accent'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Memproses ke gRPC Server...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Konfirmasi Reservasi ({selectedSeats.length} Kursi)</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
