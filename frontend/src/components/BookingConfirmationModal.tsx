import React, { useEffect, useRef } from 'react';
import { X, Download, ArrowLeft, CheckCircle, Ticket, Calendar, Clock, MapPin, User, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Movie, ReservationResultItem } from '../types';

interface BookingConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  movie: Movie;
  showtimeDate: string;
  showtimeLabel: string;
  successfulSeats: ReservationResultItem[];
  totalPrice: number;
  clientId: string;
}

export const BookingConfirmationModal: React.FC<BookingConfirmationModalProps> = ({
  isOpen,
  onClose,
  customerName,
  movie,
  showtimeDate,
  showtimeLabel,
  successfulSeats,
  totalPrice,
  clientId,
}) => {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = React.useState(false);

  useEffect(() => {
    if (isOpen) {
      // Trigger golden celebration confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#159BFA', '#EBD66D', '#FFF0A5', '#14558B'],
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const seatListStr = successfulSeats.map((s) => s.seat_id).join(', ');
  const primaryResId = successfulSeats[0]?.reservation_id || 'RES-' + Math.random().toString(36).substring(2, 9).toUpperCase();

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleDownloadPDF = async () => {
    if (!ticketRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2.5,
        backgroundColor: '#FFF0A5',
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
      pdf.save(`CineReserve-Ticket-${primaryResId.slice(0, 8)}.pdf`);
    } catch (err) {
      console.error('Failed to generate ticket PDF', err);
      alert('Gagal mengunduh PDF. Silakan coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl bg-[#1A1A1A] border border-[#2A2A2A] rounded-3xl shadow-2xl overflow-hidden my-auto p-6 sm:p-8 text-[#F5F7FA]">
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-[#929DAD] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Gold Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EBD66D]/15 border border-[#EBD66D]/40 text-[#EBD66D] text-xs font-bold mb-2">
            <CheckCircle className="w-4 h-4 text-[#EBD66D]" />
            <span>Booking Confirmed</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#EBD66D] tracking-tight glow-gold">
            Congratulations!
          </h2>
          <p className="text-base sm:text-lg font-bold text-[#F5F7FA] mt-1">
            Your Booking Is Confirmed.
          </p>
          <p className="text-xs text-[#929DAD] mt-0.5">
            Thank you for choosing <span className="text-[#159BFA] font-semibold">CineReserve</span>!
          </p>
        </div>

        {/* Two-Column Interior */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* LEFT SIDE: E-Tickets And Invoice Details */}
          <div className="md:col-span-6 flex flex-col justify-between h-full space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-[#F5F7FA] flex items-center gap-2">
                <Ticket className="w-4 h-4 text-[#159BFA]" />
                E-Tickets And Invoice
              </h3>
              <p className="text-xs text-[#929DAD] mt-1 leading-relaxed">
                Your e-tickets and booking invoice are ready. You can download your tickets below and present your ticket code when entering the cinema.
              </p>

              {/* Invoice Breakdown Table */}
              <div className="mt-4 rounded-2xl bg-[#111111] border border-[#262626] p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
                  <span className="text-[#929DAD]">Customer Name</span>
                  <span className="font-bold text-[#F5F7FA]">{customerName}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
                  <span className="text-[#929DAD]">Movie Title</span>
                  <span className="font-semibold text-[#159BFA] text-right truncate max-w-[200px]">{movie.title}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
                  <span className="text-[#929DAD]">Date & Showtime</span>
                  <span className="font-medium text-[#F5F7FA]">{showtimeDate} • {showtimeLabel}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
                  <span className="text-[#929DAD]">Cinema Hall</span>
                  <span className="font-medium text-[#F5F7FA]">{movie.venue}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
                  <span className="text-[#929DAD]">Seats Confirmed</span>
                  <span className="font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                    {seatListStr} ({successfulSeats.length} Tickets)
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 font-bold">
                  <span className="text-[#929DAD]">Total Paid</span>
                  <span className="text-emerald-400 text-sm font-extrabold">{formatRupiah(totalPrice)}</span>
                </div>
              </div>

              {/* Reservation ID Badge */}
              <div className="mt-3 p-3 rounded-xl bg-[#141414] border border-[#222222] text-[11px] text-[#929DAD] flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Reservation ID:
                  </span>
                  <span className="font-mono text-[#F5F7FA] text-[10px] select-all font-bold">
                    {primaryResId.slice(0, 18)}...
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#929DAD] pt-1 border-t border-[#222222]">
                  <span>Client ID: <span className="font-mono text-[#F5F7FA]">{clientId}</span></span>
                  <span className="text-emerald-400/90 font-semibold">● ACTIVE (SQLite Committed)</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#EBD66D] text-black font-extrabold text-xs uppercase tracking-wider hover:bg-[#ffe87c] shadow-lg shadow-[#EBD66D]/20 transition-all cursor-pointer"
              >
                {isDownloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>DOWNLOAD TICKET</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#252525] hover:bg-[#303030] text-[#F5F7FA] font-bold text-xs transition-colors cursor-pointer border border-[#333333]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>BACK TO HOMEPAGE</span>
              </button>
            </div>
          </div>

          {/* RIGHT SIDE: Digital Movie Ticket (Pale Yellow / Gold Paper Style) */}
          <div className="md:col-span-6 flex justify-center">
            <div
              ref={ticketRef}
              className="relative w-full max-w-[340px] bg-[#FFF0A5] text-[#222222] rounded-3xl shadow-2xl p-5 overflow-hidden border border-[#e4d483] select-none"
            >
              {/* Semi-circle Side Notches */}
              <div className="ticket-notch-left top-[200px]" />
              <div className="ticket-notch-right top-[200px]" />

              {/* Header Badge */}
              <div className="flex items-center justify-between border-b border-[#222222]/15 pb-3">
                <div className="flex items-center gap-1.5 font-black text-sm tracking-tight text-[#111111]">
                  <span className="w-2 h-2 rounded-full bg-[#159BFA]" />
                  <span>CineReserve</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-black text-[#FFF0A5] px-2 py-0.5 rounded-md">
                  MOVIE E-TICKET
                </span>
              </div>

              {/* Movie miniature header */}
              <div className="flex gap-3.5 my-3.5 items-center">
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  crossOrigin="anonymous"
                  className="w-14 h-20 rounded-xl object-cover shadow-md border border-black/10 shrink-0"
                />
                <div>
                  <h4 className="font-extrabold text-sm text-[#111111] leading-tight line-clamp-2">
                    {movie.title}
                  </h4>
                  <div className="text-[11px] font-semibold text-[#555555] mt-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> {customerName}
                  </div>
                  <div className="text-[10px] font-medium text-[#666666]">
                    {movie.certification} • {movie.duration}
                  </div>
                </div>
              </div>

              {/* Schedule Info Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-black/5 p-2.5 rounded-xl border border-black/5">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-[#666666] font-bold flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" /> Date
                  </div>
                  <div className="font-extrabold text-[#111111]">{showtimeDate}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-[#666666] font-bold flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> Time
                  </div>
                  <div className="font-extrabold text-[#111111]">{showtimeLabel}</div>
                </div>
                <div className="col-span-2 pt-1 border-t border-black/5">
                  <div className="text-[9px] uppercase tracking-wider text-[#666666] font-bold flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" /> Venue
                  </div>
                  <div className="font-bold text-[#111111] truncate">{movie.venue}</div>
                </div>
              </div>

              {/* Perforated Divider */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="w-full border-b-2 border-dashed border-[#a3944d]" />
              </div>

              {/* Seats & Price */}
              <div className="flex items-center justify-between my-2">
                <div>
                  <span className="text-[9px] uppercase font-bold text-[#666666] block">Seat Numbers</span>
                  <span className="text-base font-black text-[#111111] tracking-wide">
                    {seatListStr}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-[#666666] block">Total Amount</span>
                  <span className="text-sm font-extrabold text-emerald-800">
                    {formatRupiah(totalPrice)}
                  </span>
                </div>
              </div>

              {/* Barcode & QR Code simulation */}
              <div className="mt-4 pt-3 border-t border-black/10 flex flex-col items-center">
                {/* Barcode SVG */}
                <div className="w-full flex items-center justify-center gap-[3px] h-9 py-1 overflow-hidden">
                  {Array.from({ length: 48 }, (_, i) => {
                    const widthClass = i % 4 === 0 ? 'w-1' : i % 3 === 0 ? 'w-[2.5px]' : 'w-[1.2px]';
                    const heightClass = i % 7 === 0 ? 'h-5' : 'h-7';
                    return (
                      <div
                        key={i}
                        className={`${widthClass} ${heightClass} bg-black shrink-0`}
                      />
                    );
                  })}
                </div>
                <span className="text-[9px] font-mono tracking-widest text-[#555555] font-bold mt-1">
                  CR-{primaryResId.slice(0, 12).toUpperCase()}
                </span>
                <span className="text-[8px] text-[#777777] mt-0.5">
                  Demo token • Scan at CineReserve gate
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
