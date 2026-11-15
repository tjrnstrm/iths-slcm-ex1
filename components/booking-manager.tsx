'use client';

import { useState, type FormEvent } from 'react';
import type { Booking } from '@/lib/bookings';

export default function BookingManager({ initialBookings }: { initialBookings: Booking[] }) {
  const [bookings, setBookings] = useState(initialBookings);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? 'Something went wrong');
        return;
      }
      setBookings((prev) =>
        [...prev, body as Booking].sort((a, b) =>
          `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
        ),
      );
      form.reset();
    } catch {
      setError('Could not reach the server');
    } finally {
      setPending(false);
    }
  }

  async function cancel(id: string) {
    setError(null);
    const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) {
      setError('Could not cancel the booking');
      return;
    }
    setBookings((prev) => prev.filter((b) => b.id !== id));
  }

  const input = 'rounded border border-neutral-600 bg-transparent px-3 py-2';

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input name="name" required minLength={2} maxLength={60} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input name="date" type="date" required className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Time
          <input name="time" type="time" required className={input} />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-sky-600 px-4 py-2 text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {pending ? 'Booking…' : 'Book'}
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded border border-red-700 bg-red-950 px-3 py-2 text-red-300">
          {error}
        </p>
      )}

      {bookings.length === 0 ? (
        <p className="text-neutral-500">No bookings yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-700">
          {bookings.map((b) => (
            <li key={b.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{b.name}</p>
                <p className="text-sm text-neutral-400">
                  {b.date} at {b.time}
                </p>
              </div>
              <button
                onClick={() => cancel(b.id)}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Cancel
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
