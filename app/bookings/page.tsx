import { connection } from 'next/server';
import { Suspense } from 'react';
import BookingManager from '@/components/booking-manager';
import { listBookings } from '@/lib/bookings';

async function Bookings() {
  await connection();
  return <BookingManager initialBookings={listBookings()} />;
}

export default function BookingsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <h2 className="text-3xl font-bold">Bookings</h2>
      <Suspense fallback={<p className="text-neutral-500">Loading bookings…</p>}>
        <Bookings />
      </Suspense>
    </div>
  );
}
