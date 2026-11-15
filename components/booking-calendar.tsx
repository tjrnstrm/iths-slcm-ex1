'use client';

import { useState } from 'react';
import type { Booking } from '@/lib/bookings';
import {
  addDays,
  CLOSE_HOUR,
  dayLabel,
  isActiveBooking,
  isPastSlot,
  SLOT_TIMES,
  slotLabel,
  startOfWeek,
} from '@/lib/slots';

type Props = {
  initialBookings: Booking[];
  maxBookings: number;
  /** "Now" in Stockholm, computed on the server so SSR and the browser agree. */
  now: { today: string; hour: number };
};

const slotKey = (date: string, time: string) => `${date}T${time}`;

export default function BookingCalendar({ initialBookings, maxBookings, now }: Props) {
  // After today's last slot has started, the first bookable day is tomorrow
  // (e.g. on Sunday evening the calendar opens on next week).
  const firstBookableDay = now.hour >= CLOSE_HOUR - 1 ? addDays(now.today, 1) : now.today;
  const firstWeek = startOfWeek(firstBookableDay);

  const [bookings, setBookings] = useState(initialBookings);
  const [weekStart, setWeekStart] = useState(firstWeek);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const bySlot = new Map(bookings.map((b) => [slotKey(b.date, b.time), b]));
  const activeCount = bookings.filter((b) => isActiveBooking(b, now)).length;
  const limitReached = activeCount >= maxBookings;
  const isFirstWeek = weekStart === firstWeek;

  async function book(date: string, time: string) {
    if (name.trim().length < 2) {
      setError('Enter your name (at least 2 characters) before picking a slot.');
      return;
    }
    const key = slotKey(date, time);
    setPendingKey(key);
    setError(null);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, date, time }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? 'Something went wrong');
        return;
      }
      setBookings((prev) => [...prev, body as Booking]);
    } catch {
      setError('Could not reach the server');
    } finally {
      setPendingKey(null);
    }
  }

  async function cancel(booking: Booking) {
    setPendingKey(slotKey(booking.date, booking.time));
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        setError('Could not cancel the booking');
        return;
      }
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    } catch {
      setError('Could not reach the server');
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Name + limit */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Your name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="e.g. Alex"
            className="rounded border border-neutral-600 bg-transparent px-3 py-2"
          />
        </label>
        <p className={`text-sm ${limitReached ? 'text-amber-400' : 'text-neutral-400'}`}>
          {activeCount} / {maxBookings} upcoming bookings
          {limitReached && ' – limit reached'}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded border border-red-700 bg-red-950 px-3 py-2 text-red-300">
          {error}
        </p>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          disabled={isFirstWeek}
          className="rounded border border-neutral-600 px-3 py-1 text-sm hover:bg-neutral-800 disabled:opacity-30"
        >
          ← Previous
        </button>
        <p className="font-medium">
          {dayLabel(days[0]).day} – {dayLabel(days[6]).day}
        </p>
        <button
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          className="rounded border border-neutral-600 px-3 py-1 text-sm hover:bg-neutral-800"
        >
          Next →
        </button>
      </div>

      {/* Calendar grid: one column per day, one row per hour */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-24" />
              {days.map((date) => {
                const { weekday, day } = dayLabel(date);
                const isToday = date === now.today;
                return (
                  <th key={date} className={`pb-2 font-normal ${isToday ? 'text-sky-400' : ''}`}>
                    <div className="font-semibold">{weekday}</div>
                    <div className="text-xs text-neutral-400">{day}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {SLOT_TIMES.map((time) => (
              <tr key={time}>
                <th className="pr-2 text-right align-middle text-xs font-normal text-neutral-400">
                  {slotLabel(time)}
                </th>
                {days.map((date) => {
                  const key = slotKey(date, time);
                  const booking = bySlot.get(key);
                  const past = isPastSlot(date, time, now);
                  const pending = pendingKey === key;

                  return (
                    <td key={key} className="border border-neutral-800 p-1 h-14">
                      {booking ? (
                        <div className="flex h-full flex-col justify-between rounded bg-sky-900/60 px-2 py-1">
                          <span className="truncate font-medium" title={booking.name}>
                            {booking.name}
                          </span>
                          {!past && (
                            <button
                              onClick={() => cancel(booking)}
                              disabled={pending}
                              className="self-start text-xs text-red-300 hover:text-red-200 disabled:opacity-50"
                            >
                              {pending ? '…' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      ) : past ? (
                        <div className="h-full rounded bg-neutral-900" aria-label="Past slot" />
                      ) : (
                        <button
                          onClick={() => book(date, time)}
                          disabled={pending || limitReached}
                          aria-label={`Book ${date} ${slotLabel(time)}`}
                          className="h-full w-full rounded text-xs text-neutral-500 hover:bg-emerald-900/50 hover:text-emerald-200 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-500"
                        >
                          {pending ? 'Booking…' : 'Free'}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
