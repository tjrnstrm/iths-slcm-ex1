import type { NextRequest } from 'next/server';
import { deleteBooking } from '@/lib/bookings';
import { requestLogger } from '@/lib/logger';

export async function DELETE(request: NextRequest, ctx: RouteContext<'/api/bookings/[id]'>) {
  const { requestId, log } = requestLogger(request);
  const headers = { 'x-request-id': requestId };

  const { id } = await ctx.params;
  const removed = deleteBooking(id);
  if (!removed) {
    log.error('Tried to cancel a booking that does not exist', { id });
    return Response.json({ error: 'Booking not found' }, { status: 404, headers });
  }
  log.info('Booking cancelled', { id, date: removed.date, time: removed.time });
  return new Response(null, { status: 204, headers });
}
