import React from 'react';
import { X, Ticket } from 'lucide-react';

interface SelectedTicketsProps {
  selectedSeatIds: string[];
  pricePerSeat: number;
  onRemoveSeat: (seatId: string) => void;
}

export const SelectedTickets: React.FC<SelectedTicketsProps> = ({
  selectedSeatIds,
  pricePerSeat,
  onRemoveSeat,
}) => {
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="flex flex-col gap-2 mt-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-[#F5F7FA] uppercase tracking-wider">
          Selected Tickets
        </label>
        <span className="text-[11px] text-[#159BFA] font-semibold">
          {selectedSeatIds.length} {selectedSeatIds.length === 1 ? 'Seat' : 'Seats'}
        </span>
      </div>

      {selectedSeatIds.length === 0 ? (
        <div className="p-4 rounded-2xl bg-[#0D1726] border border-[#1A2638] border-dashed text-center flex flex-col items-center justify-center gap-1.5 py-6">
          <Ticket className="w-6 h-6 text-[#929DAD]/40" />
          <p className="text-xs text-[#929DAD]">No seats selected yet</p>
          <span className="text-[10px] text-[#929DAD]/70">
            Click any blue seat on the map to pick your tickets
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
          {selectedSeatIds.map((seatId) => {
            const row = seatId[0];
            const seatNum = seatId.slice(1);
            return (
              <div
                key={seatId}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#111F30] border border-[#1A2638] hover:border-[#159BFA]/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#159BFA]/20 border border-[#159BFA]/40 text-[#159BFA] flex items-center justify-center font-black text-xs">
                    {seatId}
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-[#F5F7FA]">{row} row</span>
                    <span className="text-[#929DAD] ml-2">{seatNum} seat</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#F5F7FA]">
                    {formatRupiah(pricePerSeat)}
                  </span>
                  <button
                    onClick={() => onRemoveSeat(seatId)}
                    className="p-1 rounded-md text-[#929DAD] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title={`Remove seat ${seatId}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
