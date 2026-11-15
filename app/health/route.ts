import { connection } from 'next/server';
import { listBookings } from '@/lib/bookings';
import { getConfig } from '@/lib/config';
import { logger } from '@/lib/logger';

/**
 * Health check used by Render (Health Check Path) and the Docker HEALTHCHECK.
 * connection() opts out of build-time prerendering so every call reflects the
 * live process, not a snapshot taken during `next build`.
 */
export async function GET() {
  await connection();
  const { appEnv, version } = getConfig();
  const memory = process.memoryUsage();

  const body = {
    status: 'ok',
    env: appEnv,
    version,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    bookings: listBookings().length,
    memoryMb: Math.round(memory.rss / 1024 / 1024),
  };

  // Debug, not info: Render polls this often and would otherwise flood the logs.
  logger.debug('Health check', { uptimeSeconds: body.uptimeSeconds });

  return Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
