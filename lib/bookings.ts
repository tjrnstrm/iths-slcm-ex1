import { getConfig } from './config';

/**
 * In-memory booking store.
 *
 * Deliberately simple: data lives in the Node.js process and is lost when the
 * container restarts (e.g. when Render's free instance spins down). See the
 * README for how this would change with a real database.
 */

export type Booking = {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  createdAt: string;
};

export type BookingInput = { name?: unknown; date?: unknown; time?: unknown };

export class BookingError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'BookingError';
  }
}

// Survive dev hot-reloads by keeping the store on globalThis.
const globalStore = globalThis as unknown as { __bookings?: Booking[] };
const bookings: Booking[] = (globalStore.__bookings ??= []);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function sortKey(b: Booking) {
  return `${b.date}T${b.time}`;
}

export function listBookings(): Booking[] {
  return [...bookings].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
}

export function createBooking(input: BookingInput): Booking {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const date = typeof input.date === 'string' ? input.date : '';
  const time = typeof input.time === 'string' ? input.time : '';

  if (name.length < 2 || name.length > 60) {
    throw new BookingError('Name must be between 2 and 60 characters', 400);
  }
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(date))) {
    throw new BookingError('Date must be in the format YYYY-MM-DD', 400);
  }
  if (!TIME_RE.test(time)) {
    throw new BookingError('Time must be in the format HH:MM', 400);
  }
  if (bookings.some((b) => b.date === date && b.time === time)) {
    throw new BookingError(`The slot ${date} ${time} is already booked`, 409);
  }

  const { maxBookings } = getConfig();
  if (bookings.length >= maxBookings) {
    throw new BookingError(`Booking limit reached (${maxBookings})`, 409);
  }

  const booking: Booking = {
    id: crypto.randomUUID(),
    name,
    date,
    time,
    createdAt: new Date().toISOString(),
  };
  bookings.push(booking);
  return booking;
}

export function deleteBooking(id: string): Booking | undefined {
  const index = bookings.findIndex((b) => b.id === id);
  if (index === -1) return undefined;
  return bookings.splice(index, 1)[0];
}

export function clearBookings(): number {
  const count = bookings.length;
  bookings.length = 0;
  return count;
}
