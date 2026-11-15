import type { Instrumentation } from 'next';
import { logger } from './lib/logger';

/** Runs once when the Next.js server process starts. */
export async function register() {
  // Node-only code lives in its own file so it never ends up in an Edge bundle.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node');
  }
}

/** Called by Next.js for any uncaught error in rendering, route handlers or actions. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  logger.error('Unhandled request error', {
    method: request.method,
    path: request.path,
    routePath: context.routePath,
    routeType: context.routeType,
    digest:
      typeof err === 'object' && err !== null && 'digest' in err ? String(err.digest) : undefined,
    error: err,
  });
};
