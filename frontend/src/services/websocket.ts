import type { SeatsResponse } from '../types';

export type SeatUpdateCallback = (data: SeatsResponse) => void;
export type StatusChangeCallback = (status: 'connecting' | 'connected' | 'disconnected') => void;

export class SeatStreamSubscriber {
  private ws: WebSocket | null = null;
  private showtimeId: string;
  private onUpdate: SeatUpdateCallback;
  private onStatusChange?: StatusChangeCallback;
  private shouldReconnect = true;
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;

  constructor(showtimeId: string, onUpdate: SeatUpdateCallback, onStatusChange?: StatusChangeCallback) {
    this.showtimeId = showtimeId;
    this.onUpdate = onUpdate;
    this.onStatusChange = onStatusChange;
    this.connect();
  }

  private connect() {
    if (!this.shouldReconnect) return;

    this.onStatusChange?.('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Gunakan host saat ini (akan diproxy oleh Vite dev server) atau langsung ke gateway port 8000
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/showtimes/${encodeURIComponent(this.showtimeId)}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.onStatusChange?.('connected');
        // Heartbeat ping tiap 25 detik
        this.pingTimer = window.setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send('ping');
          }
        }, 25000);
      };

      this.ws.onmessage = (event) => {
        try {
          if (event.data === 'pong') return;
          const data = JSON.parse(event.data);
          if (data.type === 'SEAT_UPDATE') {
            this.onUpdate({
              ditemukan: true,
              pesan: data.pesan,
              showtime_id: data.showtime_id,
              version: data.version,
              total_kursi: data.kursi.length,
              kursi: data.kursi,
            });
          }
        } catch (err) {
          console.warn('[WS] Failed to parse message', err);
        }
      };

      this.ws.onclose = () => {
        this.cleanupTimers();
        this.onStatusChange?.('disconnected');
        if (this.shouldReconnect) {
          this.reconnectTimer = window.setTimeout(() => this.connect(), 2000);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WS] Stream error, will reconnect', err);
        this.ws?.close();
      };
    } catch (err) {
      console.error('[WS] Connection exception', err);
      this.onStatusChange?.('disconnected');
    }
  }

  private cleanupTimers() {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public disconnect() {
    this.shouldReconnect = false;
    this.cleanupTimers();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.onStatusChange?.('disconnected');
  }
}
