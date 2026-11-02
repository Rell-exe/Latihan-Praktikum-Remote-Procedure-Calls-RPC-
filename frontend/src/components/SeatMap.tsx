import React from 'react';
import { SeatItem } from './SeatItem';
import type { Seat, SeatStatus } from '../types';
import { Radio } from 'lucide-react';

interface SeatMapProps {
  seats: Seat[];
  selectedSeatIds: string[];
  onToggleSeat: (seatId: string) => void;
  streamStatus: 'connecting' | 'connected' | 'disconnected';
  version: number;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  seats,
  selectedSeatIds,
  onToggleSeat,
  streamStatus,
  version,
}) => {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  // Map seat_id -> Seat object for fast lookup
  const seatMap = new Map<string, Seat>();
  seats.forEach((s) => seatMap.set(s.seat_id, s));

  const getSeatStatus = (seatId: string): SeatStatus => {
    if (selectedSeatIds.includes(seatId)) return 'SELECTED';
    const s = seatMap.get(seatId);
    if (!s) return 'AVAILABLE';
    return s.status === 'BOOKED' ? 'BOOKED' : 'AVAILABLE';
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Top Bar: Screen Info & Live WebSocket Status */}
      <div className="w-full flex items-center justify-between px-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#F5F7FA] uppercase tracking-wider">
            Seat Selection
          </span>
          <span className="text-[11px] text-[#929DAD]">
            (112 Seats / 7 Rows)
          </span>
        </div>

        {/* Live Stream Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0D1726] border border-[#1A2638] text-[10px]">
          <span
            className={`w-2 h-2 rounded-full ${
              streamStatus === 'connected'
                ? 'bg-emerald-400 animate-ping'
                : streamStatus === 'connecting'
                ? 'bg-amber-400'
                : 'bg-rose-400'
            }`}
          />
          <span className="text-[#929DAD] flex items-center gap-1">
            <Radio className="w-3 h-3 text-[#159BFA]" />
            {streamStatus === 'connected' ? `Live Sync (v${version})` : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Screen Indicator: Curved Glowing Arc */}
      <div className="w-full max-w-xl flex flex-col items-center mb-7">
        <div className="relative w-4/5 h-6">
          <svg
            viewBox="0 0 300 24"
            className="w-full h-full text-[#159BFA] drop-shadow-[0_4px_12px_rgba(21,155,250,0.6)]"
          >
            <path
              d="M 10 20 Q 150 0 290 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span className="text-[11px] font-extrabold tracking-[0.25em] text-[#929DAD] uppercase -mt-1 select-none">
          SCREEN
        </span>
      </div>

      {/* Seat Grid with Center Aisle */}
      <div className="w-full overflow-x-auto pb-4 flex justify-center">
        <div className="flex flex-col gap-2 min-w-max px-2">
          {rows.map((row) => (
            <div key={row} className="flex items-center gap-2">
              {/* Left Row Label */}
              <span className="w-4 text-center text-xs font-bold text-[#929DAD] select-none">
                {row}
              </span>

              {/* Left Block: Seats 01 to 08 */}
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 8 }, (_, i) => {
                  const col = i + 1;
                  const seatId = `${row}${col < 10 ? `0${col}` : col}`;
                  return (
                    <SeatItem
                      key={seatId}
                      seatId={seatId}
                      status={getSeatStatus(seatId)}
                      onClick={() => onToggleSeat(seatId)}
                    />
                  );
                })}
              </div>

              {/* Center Aisle Gap */}
              <div className="w-5 sm:w-8 flex items-center justify-center">
                <div className="w-[1px] h-4 bg-[#1A2638]" />
              </div>

              {/* Right Block: Seats 09 to 16 */}
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 8 }, (_, i) => {
                  const col = i + 9;
                  const seatId = `${row}${col < 10 ? `0${col}` : col}`;
                  return (
                    <SeatItem
                      key={seatId}
                      seatId={seatId}
                      status={getSeatStatus(seatId)}
                      onClick={() => onToggleSeat(seatId)}
                    />
                  );
                })}
              </div>

              {/* Right Row Label */}
              <span className="w-4 text-center text-xs font-bold text-[#929DAD] select-none">
                {row}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-[#1A2638] w-full max-w-md">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-[4px] bg-[#159BFA] glow-seat-selected border border-white/60" />
          <span className="text-xs text-[#F5F7FA] font-medium">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-[4px] bg-[#14558B] border border-[#1b6cb0]" />
          <span className="text-xs text-[#929DAD] font-medium">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-[4px] bg-[#252C38] border border-[#1e242f]" />
          <span className="text-xs text-[#929DAD] font-medium">Booked</span>
        </div>
      </div>
    </div>
  );
};
