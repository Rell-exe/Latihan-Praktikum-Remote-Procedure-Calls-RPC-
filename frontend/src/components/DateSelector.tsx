import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ShowtimeDate } from '../types';

interface DateSelectorProps {
  dates: ShowtimeDate[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export const DateSelector: React.FC<DateSelectorProps> = ({
  dates,
  selectedDate,
  onSelectDate,
}) => {
  return (
    <div className="w-full py-3.5 px-4 sm:px-8 border-b border-[#1A2638] bg-[#07111F]/50 flex items-center justify-between gap-3 overflow-x-auto">
      <button
        className="p-2 rounded-xl bg-[#0D1726] border border-[#1A2638] text-[#929DAD] hover:text-[#F5F7FA] hover:border-[#159BFA]/40 transition-colors shrink-0"
        title="Previous Week"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* 7 Days Row */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-center min-w-max">
        {dates.map((item) => {
          const isSelected = item.date === selectedDate;
          return (
            <button
              key={item.date}
              onClick={() => onSelectDate(item.date)}
              className={`flex flex-col items-center justify-center px-3.5 sm:px-5 py-2 rounded-2xl transition-all cursor-pointer select-none min-w-[58px] sm:min-w-[68px] ${
                isSelected
                  ? 'bg-[#159BFA] text-white border-2 border-[#159BFA] shadow-lg shadow-[#159BFA]/30 glow-accent transform scale-105'
                  : 'bg-[#111F30] text-[#929DAD] border border-[#1A2638] hover:text-[#F5F7FA] hover:border-[#159BFA]/30 hover:bg-[#14263b]'
              }`}
            >
              <span className={`text-[10px] sm:text-xs font-semibold tracking-wider uppercase ${isSelected ? 'text-white/90' : 'text-[#929DAD]'}`}>
                {item.dayName}
              </span>
              <span className={`text-base sm:text-lg font-extrabold ${isSelected ? 'text-white' : 'text-[#F5F7FA]'}`}>
                {item.dayNumber}
              </span>
            </button>
          );
        })}
      </div>

      <button
        className="p-2 rounded-xl bg-[#0D1726] border border-[#1A2638] text-[#929DAD] hover:text-[#F5F7FA] hover:border-[#159BFA]/40 transition-colors shrink-0"
        title="Next Week"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
