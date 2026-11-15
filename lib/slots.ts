/**
 * Opening hours and time helpers. Pure functions with no server-only imports,
 * so both the server (validation) and the calendar UI can use them.
 */

export const OPEN_HOUR = 10;
export const CLOSE_HOUR = 18; // last slot is 17:00–18:00
export const TIME_ZONE = 'Europe/Stockholm';

/** ["10:00", "11:00", …, "17:00"] */
export const SLOT_TIMES = Array.from(
  { length: CLOSE_HOUR - OPEN_HOUR },
  (_, i) => `${String(OPEN_HOUR + i).padStart(2, '0')}:00`,
);

export function isValidSlotTime(time: string) {
  return SLOT_TIMES.includes(time);
}

export function slotLabel(time: string) {
  const hour = Number(time.slice(0, 2));
  return `${time}–${String(hour + 1).padStart(2, '0')}:00`;
}

/** Current date (YYYY-MM-DD) and hour in Stockholm, regardless of server time zone. */
export function stockholmNow(now = new Date()) {
  // sv-SE formats as "2026-11-15 21:23:43"
  const s = now.toLocaleString('sv-SE', { timeZone: TIME_ZONE, hour12: false });
  return { today: s.slice(0, 10), hour: Number(s.slice(11, 13)) };
}

/** True if the slot has started or is in the past (Stockholm time). */
export function isPastSlot(date: string, time: string, now = stockholmNow()) {
  if (date < now.today) return true;
  if (date > now.today) return false;
  return Number(time.slice(0, 2)) <= now.hour;
}

/**
 * A booking that still "uses up" one of the MAX_BOOKINGS places: it is in a
 * valid slot and has not started yet. Past bookings no longer count.
 */
export function isActiveBooking(
  booking: { date: string; time: string },
  now = stockholmNow(),
) {
  return isValidSlotTime(booking.time) && !isPastSlot(booking.date, booking.time, now);
}

// ---- Date-string arithmetic in UTC so results never depend on a time zone

function toDate(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

export function addDays(date: string, days: number) {
  const d = toDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week that contains `date`. */
export function startOfWeek(date: string) {
  const weekday = (toDate(date).getUTCDay() + 6) % 7; // Mon = 0 … Sun = 6
  return addDays(date, -weekday);
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dayLabel(date: string) {
  const d = toDate(date);
  return {
    weekday: WEEKDAYS[(d.getUTCDay() + 6) % 7],
    day: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`,
  };
}
