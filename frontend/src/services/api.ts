import type { CatalogResponse, ReservationResponse, SeatsResponse } from '../types';

const API_BASE = '/api';

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchCatalog(): Promise<CatalogResponse> {
  const res = await fetch(`${API_BASE}/catalog`);
  if (!res.ok) {
    throw new Error(`Failed to load catalog: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchSeats(showtimeId: string): Promise<SeatsResponse> {
  const res = await fetch(`${API_BASE}/showtimes/${encodeURIComponent(showtimeId)}/seats`);
  if (!res.ok) {
    throw new Error(`Failed to load seats for ${showtimeId}: ${res.statusText}`);
  }
  return res.json();
}

export interface ReservePayload {
  showtime_id: string;
  nama_pemesan: string;
  client_id: string;
  seats: string[];
  request_ids?: Record<string, string>;
}

export async function reserveSeats(payload: ReservePayload): Promise<ReservationResponse> {
  const res = await fetch(`${API_BASE}/reservations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to submit reservation');
  }

  return res.json();
}

export async function cancelReservation(payload: { reservation_id: string; client_id: string; request_id?: string }) {
  const res = await fetch(`${API_BASE}/reservations/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to cancel reservation');
  }

  return res.json();
}
