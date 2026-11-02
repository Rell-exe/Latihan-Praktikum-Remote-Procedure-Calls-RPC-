import React from 'react';
import type { TimeSlot } from '../types';

interface ShowtimeSelectorProps {
  timeSlots: TimeSlot[];
  selectedSlot: string;
  onSelectSlot: (slot: string) => void;
}

export const ShowtimeSelector: React.FC<ShowtimeSelectorProps> = ({
  timeSlots,
  selectedSlot,
  onSelectSlot,
}) => {
  return (
    <div className="flex flex-col gap-2 mt-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-[#F5F7FA] uppercase tracking-wider">
          Selected Time
        </label>
        <span className="text-[10px] text-[#929DAD]">IMAX & 2D Atmos</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {timeSlots.map((item) => {
          const isSelected = item.slot === selectedSlot;
          return (
            <button
              key={item.slot}
              onClick={() => onSelectSlot(item.slot)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl border transition-all text-xs font-semibold cursor-pointer select-none ${
                isSelected
                  ? 'bg-[#159BFA] text-white border-[#159BFA] shadow-md shadow-[#159BFA]/30 glow-accent'
                  : 'bg-[#111F30] text-[#929DAD] border-[#1A2638] hover:text-[#F5F7FA] hover:border-[#159BFA]/40 hover:bg-[#14263b]'
              }`}
            >
              <span className="font-bold text-xs">{item.label}</span>
              <span className={`text-[9px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-[#929DAD]/70'}`}>
                {item.format}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
