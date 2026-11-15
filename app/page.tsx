import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { listBookings } from '@/lib/bookings';
import { getConfig } from '@/lib/config';

async function Stats() {
  await connection();
  const bookings = listBookings();
  const { maxBookings } = getConfig();
  const next = bookings[0];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card label="Bookings" value={`${bookings.length} / ${maxBookings}`} />
      <Card label="Next booking" value={next ? `${next.date} ${next.time}` : '—'} />
      <Card label="Booked by" value={next ? next.name : '—'} />
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-700 p-4">
      <p className="text-xs uppercase text-neutral-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <h2 className="text-3xl font-bold">Dashboard</h2>
      <p className="text-neutral-400">
        A small booking system used to demonstrate Docker, CI/CD with GitHub Actions and
        deployment to Render.
      </p>
      <Suspense fallback={<p className="text-neutral-500">Loading stats…</p>}>
        <Stats />
      </Suspense>
      <Link href="/bookings" className="self-start rounded bg-sky-600 px-4 py-2 text-white hover:bg-sky-500">
        Make a booking
      </Link>
    </div>
  );
}
