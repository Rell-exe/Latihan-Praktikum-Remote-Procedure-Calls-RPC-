import React from 'react';
import { X, Ticket, Trash2 } from 'lucide-react';
import type { ReservationResultItem } from '../types';

interface MyTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservations: ReservationResultItem[];
  onCancelReservation: (reservationId: string) => Promise<void>;
  isCancelling: boolean;
}

export const MyTicketsModal: React.FC<MyTicketsModalProps> = ({
  isOpen,
  onClose,
  reservations,
  onCancelReservation,
  isCancelling,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0D1726] border border-[#1A2638] rounded-3xl shadow-2xl overflow-hidden p-6 text-[#F5F7FA]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-[#929DAD] hover:text-white hover:bg-[#111F30] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#159BFA]/20 border border-[#159BFA]/40 text-[#159BFA] flex items-center justify-center">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">My Booked Tickets</h2>
            <p className="text-xs text-[#929DAD]">Daftar tiket aktif yang tersimpan di server gRPC</p>
          </div>
        </div>

        {reservations.length === 0 ? (
          <div className="p-8 text-center border border-[#1A2638] rounded-2xl bg-[#07111F] flex flex-col items-center justify-center gap-2">
            <Ticket className="w-8 h-8 text-[#929DAD]/40" />
            <p className="text-xs text-[#929DAD]">Belum ada tiket aktif yang dipesan.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
            {reservations.map((item) => (
              <div
                key={item.reservation_id}
                className="p-3.5 rounded-2xl bg-[#111F30] border border-[#1A2638] flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#159BFA]/20 text-[#159BFA] font-bold text-xs border border-[#159BFA]/30">
                      Kursi {item.seat_id}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold">● ACTIVE</span>
                  </div>
                  <div className="text-[10px] text-[#929DAD] font-mono mt-1">
                    ID: {item.reservation_id.slice(0, 16)}...
                  </div>
                </div>

                <button
                  onClick={() => onCancelReservation(item.reservation_id)}
                  disabled={isCancelling}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-semibold transition-colors cursor-pointer"
                  title="Batalkan reservasi ini via gRPC BatalkanReservasi"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Batalkan</span>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-[#1A2638] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#111F30] hover:bg-[#172b42] text-xs font-bold text-[#F5F7FA] transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
