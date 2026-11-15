import type { NextRequest } from 'next/server';
import { BookingError, clearBookings, createBooking, listBookings } from '@/lib/bookings';
import { getConfig } from '@/lib/config';
import { requestLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const { requestId, log } = requestLogger(request);
  const bookings = listBookings();
  log.debug('Bookings listed', { count: bookings.length });
  return Response.json(bookings, { headers: { 'x-request-id': requestId } });
}

export async function POST(request: NextRequest) {
  const { requestId, log } = requestLogger(request);
  const headers = { 'x-request-id': requestId };

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    // Client mistake: the reason is enough, a stack trace would only be noise.
    log.error('Invalid JSON in booking request', {
      reason: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: 'Request body must be valid JSON' }, { status: 400, headers });
  }

  try {
    const booking = createBooking((body ?? {}) as Record<string, unknown>);
    log.info('Booking created', {
      id: booking.id,
      date: booking.date,
      time: booking.time,
      total: listBookings().length,
    });
    return Response.json(booking, { status: 201, headers });
  } catch (error) {
    if (error instanceof BookingError) {
      log.error('Booking rejected', { reason: error.message, status: error.status });
      return Response.json({ error: error.message }, { status: error.status, headers });
    }
    log.error('Unexpected error while creating booking', { error });
    return Response.json({ error: 'Internal server error' }, { status: 500, headers });
  }
}

/** Admin-only: wipe all bookings. Protected by the ADMIN_API_KEY secret. */
export async function DELETE(request: NextRequest) {
  const { requestId, log } = requestLogger(request);
  const headers = { 'x-request-id': requestId };

  const { adminApiKey } = getConfig();
  if (!adminApiKey) {
    log.warn('Admin reset attempted but ADMIN_API_KEY is not configured');
    return Response.json({ error: 'Admin endpoint disabled' }, { status: 503, headers });
  }
  if (request.headers.get('x-admin-key') !== adminApiKey) {
    // Never log the key that was sent – only that the attempt failed.
    log.error('Unauthorized admin reset attempt');
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
  }
  const removed = clearBookings();
  log.info('All bookings cleared by admin', { removed });
  return Response.json({ removed }, { headers });
}
