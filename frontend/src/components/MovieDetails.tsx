import React, { useState } from 'react';
import { Play, Star, Clock, Film, X } from 'lucide-react';
import type { Movie } from '../types';

interface MovieDetailsProps {
  movie: Movie;
}

export const MovieDetails: React.FC<MovieDetailsProps> = ({ movie }) => {
  const [showTrailerModal, setShowTrailerModal] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-5">
        {/* Movie Poster (2:3 aspect ratio) with Play Trailer Button */}
        <div className="relative group shrink-0 w-36 sm:w-44 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-[#1A2638] bg-[#091322] mx-auto sm:mx-0">
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07111F] via-transparent to-black/20 opacity-80" />

          {/* Circular Blue Play Button */}
          <button
            onClick={() => setShowTrailerModal(true)}
            className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-[#159BFA] text-white flex items-center justify-center shadow-lg shadow-[#159BFA]/40 border-2 border-white/80 transform group-hover:scale-110 transition-all focus:outline-none"
            title="Watch Trailer"
          >
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </button>
        </div>

        {/* Movie Information */}
        <div className="flex flex-col justify-between flex-1">
          <div>
            {/* Title & Certification */}
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#111F30] border border-[#1A2638] text-[#159BFA]">
                {movie.certification}
              </span>
              <span className="text-xs text-[#929DAD] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {movie.duration}
              </span>
              <span className="text-xs text-[#929DAD]">• {movie.year}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-[#F5F7FA] tracking-tight leading-snug">
              {movie.title}
            </h1>

            {/* IMDb / Audience Rating */}
            <div className="flex items-center gap-3 my-2.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold">{movie.imdbRating}</span>
                <span className="text-[10px] text-amber-400/70 font-normal">/ 10</span>
              </div>
              <span className="text-[11px] text-[#929DAD] font-medium">Audience Score</span>
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-1.5 my-2">
              {movie.genres.map((genre) => (
                <span
                  key={genre}
                  className="px-2.5 py-0.5 text-[11px] font-medium rounded-lg bg-[#111F30] border border-[#1A2638] text-[#929DAD]"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>

          {/* Synopsis */}
          <p className="text-xs text-[#929DAD] line-clamp-3 sm:line-clamp-4 leading-relaxed mt-1">
            {movie.synopsis}
          </p>
        </div>
      </div>

      {/* Trailer Modal */}
      {showTrailerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-[#0D1726] border border-[#1A2638] rounded-2xl overflow-hidden shadow-2xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1A2638]">
              <div className="flex items-center gap-2 text-sm font-bold text-[#F5F7FA]">
                <Film className="w-4 h-4 text-[#159BFA]" /> Official Trailer: {movie.title}
              </div>
              <button
                onClick={() => setShowTrailerModal(false)}
                className="p-1 rounded-lg text-[#929DAD] hover:text-[#F5F7FA] hover:bg-[#111F30]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video w-full mt-3 rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <iframe
                src="https://www.youtube.com/embed/d9MyW72ELq0?autoplay=1"
                title="Trailer"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
