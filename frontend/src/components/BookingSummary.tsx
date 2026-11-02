import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';

interface BookingSummaryProps {
  selectedCount: number;
  pricePerSeat: number;
  onProceedToCheckout: () => void;
  isLoading?: boolean;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  selectedCount,
  pricePerSeat,
  onProceedToCheckout,
  isLoading = false,
}) => {
  const totalPrice = selectedCount * pricePerSeat;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="flex flex-col gap-3.5 mt-auto pt-4 border-t border-[#1A2638]">
      {/* Price breakdown */}
      <div className="flex items-center justify-between text-xs text-[#929DAD]">
        <span>Seats ({selectedCount} x {formatRupiah(pricePerSeat)})</span>
        <span className="text-[#F5F7FA] font-medium">{formatRupiah(totalPrice)}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] text-[#929DAD] uppercase tracking-wider block">Total Payment</span>
          <span className="text-xl sm:text-2xl font-black text-[#F5F7FA] tracking-tight">
            {formatRupiah(totalPrice)}
          </span>
        </div>

        {/* BUY BUTTON */}
        <button
          onClick={onProceedToCheckout}
          disabled={selectedCount === 0 || isLoading}
          className={`flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 rounded-2xl font-bold text-sm transition-all select-none ${
            selectedCount > 0 && !isLoading
              ? 'bg-[#159BFA] text-white hover:bg-[#188fe4] shadow-lg shadow-[#159BFA]/30 glow-accent transform hover:-translate-y-0.5 cursor-pointer'
              : 'bg-[#111F30] text-[#929DAD]/50 border border-[#1A2638] cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>BUY TICKETS</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </>
          )}
        </button>
      </div>

      {selectedCount === 0 && (
        <p className="text-[11px] text-amber-400/80 text-center font-medium">
          Please select at least 1 seat on the map to proceed
        </p>
      )}
    </div>
  );
};
