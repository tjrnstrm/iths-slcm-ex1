import { connection } from 'next/server';
import { Suspense } from 'react';
import BookingCalendar from '@/components/booking-calendar';
import { listBookings } from '@/lib/bookings';
import { getConfig } from '@/lib/config';
import { stockholmNow } from '@/lib/slots';

async function Calendar() {
  await connection();
  return (
    <BookingCalendar
      initialBookings={listBookings()}
      maxBookings={getConfig().maxBookings}
      now={stockholmNow()}
    />
  );
}

export default function BookingsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h2 className="text-3xl font-bold">Bookings</h2>
        <p className="text-neutral-400">
          One-hour slots between 10:00 and 18:00, every day. Enter your name and click a free slot.
        </p>
      </div>
      <Suspense fallback={<p className="text-neutral-500">Loading calendar…</p>}>
        <Calendar />
      </Suspense>
    </div>
  );
}
