export type SeatStatus = 'AVAILABLE' | 'BOOKED' | 'SELECTED';

export interface Seat {
  seat_id: string;
  status: 'AVAILABLE' | 'BOOKED';
  reservation_id?: string;
}

export interface Movie {
  id: string;
  title: string;
  director: string;
  year: string;
  duration: string;
  certification: string;
  imdbRating: string;
  genres: string[];
  synopsis: string;
  venue: string;
  pricePerSeat: number;
  currency: string;
  posterUrl: string;
  trailerUrl: string;
}

export interface ShowtimeDate {
  dayName: string;
  dayNumber: number;
  date: string;
  isWeekend: boolean;
}

export interface TimeSlot {
  slot: string;
  label: string;
  format: string;
}

export interface CatalogResponse {
  movie: Movie;
  dates: ShowtimeDate[];
  timeSlots: TimeSlot[];
  defaultDate: string;
  defaultTime: string;
  defaultShowtimeId: string;
}

export interface SeatsResponse {
  ditemukan: boolean;
  pesan: string;
  showtime_id: string;
  version: number;
  total_kursi: number;
  kursi: Seat[];
}

export interface ReservationResultItem {
  seat_id: string;
  sukses: boolean;
  pesan: string;
  reservation_id: string;
  status: string;
  request_id: string;
}

export interface ReservationResponse {
  showtime_id: string;
  nama_pemesan: string;
  total_requested: number;
  successful_count: number;
  failed_count: number;
  is_all_successful: boolean;
  results: ReservationResultItem[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}
