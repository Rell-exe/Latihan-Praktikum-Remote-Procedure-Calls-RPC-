import React, { useState } from 'react';
import { Menu, Ticket, Search, Heart, User, Film, ChevronDown, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  activeReservationsCount: number;
  onOpenMyTickets: () => void;
  clientId: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeReservationsCount,
  onOpenMyTickets,
  clientId,
}) => {
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const genres = ['All', 'Action', 'Sci-Fi', 'Drama'];

  return (
    <header className="w-full border-b border-[#1A2638] bg-[#07111F]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 transition-all">
      {/* Left section: Hamburger & Category Filters */}
      <div className="flex items-center gap-3 md:gap-5">
        <button
          className="p-2 rounded-xl text-[#929DAD] hover:text-[#F5F7FA] hover:bg-[#111F30] transition-colors focus:outline-none"
          title="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Genre Pill Filters */}
        <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-xl bg-[#0D1726] border border-[#1A2638]">
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                selectedGenre === genre
                  ? 'bg-[#159BFA] text-white shadow-sm font-semibold'
                  : 'text-[#929DAD] hover:text-[#F5F7FA] hover:bg-[#111F30]'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Price Tag Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0D1726] border border-[#1A2638] text-xs text-[#929DAD]">
          <span>Std:</span>
          <span className="text-[#159BFA] font-semibold">Rp50.000</span>
        </div>
      </div>

      {/* Center section: Brand Logo */}
      <div className="flex items-center gap-2 cursor-pointer select-none">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#14558B] to-[#159BFA] flex items-center justify-center shadow-lg shadow-[#159BFA]/20 border border-[#159BFA]/40">
          <Film className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#F5F7FA] flex items-center">
            Cine<span className="text-[#159BFA]">Reserve</span>
          </span>
          <span className="text-[9px] tracking-wider uppercase text-[#929DAD] font-semibold -mt-1">
            gRPC Distributed Cinema
          </span>
        </div>
      </div>

      {/* Right section: Ticket badge, search, favorite, avatar */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* Search */}
        <div className="relative">
          {searchOpen ? (
            <div className="flex items-center bg-[#0D1726] border border-[#159BFA]/40 rounded-xl px-2.5 py-1">
              <Search className="w-4 h-4 text-[#929DAD] mr-1.5" />
              <input
                type="text"
                placeholder="Search film..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                onBlur={() => !searchQuery && setSearchOpen(false)}
                className="bg-transparent text-xs text-[#F5F7FA] focus:outline-none w-28 sm:w-40"
              />
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-xl text-[#929DAD] hover:text-[#F5F7FA] hover:bg-[#111F30] transition-colors"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Favorite */}
        <button
          className="p-2 rounded-xl text-[#929DAD] hover:text-rose-400 hover:bg-[#111F30] transition-colors hidden xs:flex"
          title="Favorites"
        >
          <Heart className="w-4 h-4" />
        </button>

        {/* My Tickets / Active Reservations */}
        <button
          onClick={onOpenMyTickets}
          className="relative p-2 rounded-xl text-[#929DAD] hover:text-[#159BFA] hover:bg-[#111F30] transition-colors flex items-center"
          title="My Booked Tickets"
        >
          <Ticket className="w-4 h-4" />
          {activeReservationsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#159BFA] text-white text-[10px] font-bold flex items-center justify-center shadow-md animate-pulse">
              {activeReservationsCount}
            </span>
          )}
        </button>

        {/* User Profile / Avatar with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 rounded-xl bg-[#0D1726] border border-[#1A2638] hover:border-[#159BFA]/40 transition-all focus:outline-none"
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#111F30] to-[#14558B] flex items-center justify-center text-xs font-bold text-[#159BFA]">
              <User className="w-3.5 h-3.5" />
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#929DAD]" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-[#0D1726] border border-[#1A2638] rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#1A2638]">
                <div className="w-8 h-8 rounded-full bg-[#159BFA]/20 border border-[#159BFA]/50 flex items-center justify-center text-[#159BFA] font-bold text-xs">
                  CR
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#F5F7FA]">Demo User</div>
                  <div className="text-[10px] text-[#929DAD] font-mono truncate max-w-[150px]">
                    ID: {clientId}
                  </div>
                </div>
              </div>

              <div className="py-2 text-[11px] text-[#929DAD] flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span>Backend RPC:</span>
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> gRPC v1.85
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Gateway:</span>
                  <span className="text-[#159BFA] font-medium">FastAPI + WS</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Database:</span>
                  <span className="text-amber-400 font-medium">SQLite WAL</span>
                </div>
              </div>

              <button
                onClick={() => setShowProfileMenu(false)}
                className="w-full text-center py-1.5 text-xs text-[#929DAD] hover:text-[#F5F7FA] hover:bg-[#111F30] rounded-lg transition-colors mt-1"
              >
                Tutup
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
