import { connection } from 'next/server';
import { Suspense } from 'react';
import { getConfig } from '@/lib/config';

/**
 * Shows the non-secret runtime configuration, which makes the difference
 * between the dev and prod environments visible. ADMIN_API_KEY is only
 * reported as set/not set; its value never leaves the server.
 */
async function ConfigTable() {
  await connection();
  const config = getConfig();
  const rows: [string, string][] = [
    ['APP_ENV', config.appEnv],
    ['NODE_ENV', process.env.NODE_ENV ?? 'unknown'],
    ['LOG_LEVEL', config.logLevel],
    ['MAX_BOOKINGS', String(config.maxBookings)],
    ['ADMIN_API_KEY', config.adminApiKey ? 'configured (hidden)' : 'not set'],
    ['Version', config.version],
  ];

  return (
    <table className="w-full text-left text-sm">
      <tbody className="divide-y divide-neutral-800">
        {rows.map(([key, value]) => (
          <tr key={key}>
            <th className="py-2 pr-6 font-mono font-normal text-neutral-400">{key}</th>
            <td className="py-2 font-mono">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Settings() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h2 className="text-3xl font-bold">Settings</h2>
      <p className="text-neutral-400">
        Runtime configuration read from environment variables on the server.
      </p>
      <Suspense fallback={<p className="text-neutral-500">Loading configuration…</p>}>
        <ConfigTable />
      </Suspense>
    </div>
  );
}
