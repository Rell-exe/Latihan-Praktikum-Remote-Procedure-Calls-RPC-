import React from 'react';
import type { SeatStatus } from '../types';

interface SeatItemProps {
  seatId: string;
  status: SeatStatus;
  onClick: () => void;
}

export const SeatItem: React.FC<SeatItemProps> = ({ seatId, status, onClick }) => {
  // Extract number for display, e.g. "08" from "B08"
  const seatNum = seatId.slice(1);

  if (status === 'BOOKED') {
    return (
      <div
        className="w-6 h-6 sm:w-7 sm:h-7 rounded-[7px] bg-[#252C38] text-[#556070] flex items-center justify-center text-[10px] font-bold cursor-not-allowed select-none border border-[#1e242f] transition-all"
        title={`Seat ${seatId} — Booked`}
      >
        {seatNum}
      </div>
    );
  }

  if (status === 'SELECTED') {
    return (
      <button
        onClick={onClick}
        className="w-6 h-6 sm:w-7 sm:h-7 rounded-[7px] bg-[#159BFA] text-white flex items-center justify-center text-[10px] font-extrabold cursor-pointer select-none border border-white/60 glow-seat-selected transform scale-105 transition-all shadow-md animate-pulse"
        title={`Seat ${seatId} — Selected (Click to deselect)`}
      >
        {seatNum}
      </button>
    );
  }

  // AVAILABLE
  return (
    <button
      onClick={onClick}
      className="w-6 h-6 sm:w-7 sm:h-7 rounded-[7px] bg-[#14558B] text-white/90 flex items-center justify-center text-[10px] font-semibold cursor-pointer select-none border border-[#1b6cb0] hover:bg-[#186cb3] hover:scale-110 hover:shadow-md hover:border-[#159BFA] transition-all"
      title={`Seat ${seatId} — Available`}
    >
      {seatNum}
    </button>
  );
};
