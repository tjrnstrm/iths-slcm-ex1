import { getConfig } from './config';
import {
  addDays,
  CLOSE_HOUR,
  isActiveBooking,
  isPastSlot,
  isValidSlotTime,
  OPEN_HOUR,
} from './slots';

/**
 * In-memory booking store.
 *
 * Bookings are one-hour slots (see lib/slots.ts). Deliberately simple: data
 * lives in the Node.js process and is lost when the container restarts (e.g. when Render's free instance spins down). See the
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

function sortKey(b: Booking) {
  return `${b.date}T${b.time}`;
}

export function listBookings(): Booking[] {
  return [...bookings].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
}

export function countActiveBookings(): number {
  return bookings.filter((b) => isActiveBooking(b)).length;
}

export function createBooking(input: BookingInput): Booking {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const date = typeof input.date === 'string' ? input.date : '';
  const time = typeof input.time === 'string' ? input.time : '';

  if (name.length < 2 || name.length > 60) {
    throw new BookingError('Name must be between 2 and 60 characters', 400);
  }
  // Round-trip check also rejects impossible dates such as 2026-02-31
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(date)) || addDays(date, 0) !== date) {
    throw new BookingError('Date must be a valid date in the format YYYY-MM-DD', 400);
  }
  if (!isValidSlotTime(time)) {
    throw new BookingError(
      `Time must be a full hour between ${OPEN_HOUR}:00 and ${CLOSE_HOUR - 1}:00`,
      400,
    );
  }
  if (isPastSlot(date, time)) {
    throw new BookingError(`The slot ${date} ${time} has already started or passed`, 400);
  }
  if (bookings.some((b) => b.date === date && b.time === time)) {
    throw new BookingError(`The slot ${date} ${time} is already booked`, 409);
  }

  // Only upcoming bookings count towards the limit; past ones free their place.
  const { maxBookings } = getConfig();
  if (countActiveBookings() >= maxBookings) {
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
