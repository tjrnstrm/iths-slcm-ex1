import pkg from '../package.json';
import { isLogLevel, logger, type LogLevel } from './logger';

/**
 * Single, typed source of runtime configuration.
 *
 * Everything here is read from process.env on the SERVER at request time,
 * so the same Docker image can run with different settings in dev and prod.
 * Nothing in this file is ever sent to the browser except the values that
 * pages explicitly render (and ADMIN_API_KEY is never rendered).
 */

export type AppEnv = 'development' | 'production';

export type Config = {
  appEnv: AppEnv;
  logLevel: LogLevel;
  maxBookings: number;
  /** Secret. Server-only. Undefined means admin endpoints are disabled. */
  adminApiKey: string | undefined;
  version: string;
};

const DEFAULT_MAX_BOOKINGS = 5;

// Only warn once per process for each bad value, not on every request.
const warned = new Set<string>();
function warnOnce(key: string, message: string, context: Record<string, unknown>) {
  if (warned.has(key)) return;
  warned.add(key);
  logger.error(message, context);
}

function readAppEnv(): AppEnv {
  const raw = process.env.APP_ENV;
  if (raw === 'development' || raw === 'production') return raw;
  if (raw !== undefined) {
    warnOnce('APP_ENV', 'Invalid APP_ENV, falling back to NODE_ENV', { value: raw });
  }
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

function readLogLevel(appEnv: AppEnv): LogLevel {
  const raw = process.env.LOG_LEVEL?.toLowerCase();
  if (isLogLevel(raw)) return raw;
  if (raw !== undefined) {
    warnOnce('LOG_LEVEL', 'Invalid LOG_LEVEL, using default', { value: raw });
  }
  return appEnv === 'production' ? 'info' : 'debug';
}

function readMaxBookings(): number {
  const raw = process.env.MAX_BOOKINGS;
  if (raw === undefined || raw === '') return DEFAULT_MAX_BOOKINGS;
  const n = Number(raw);
  if (Number.isInteger(n) && n > 0) return n;
  warnOnce('MAX_BOOKINGS', 'Invalid MAX_BOOKINGS, using default', {
    value: raw,
    default: DEFAULT_MAX_BOOKINGS,
  });
  return DEFAULT_MAX_BOOKINGS;
}

export function getConfig(): Config {
  const appEnv = readAppEnv();
  return {
    appEnv,
    logLevel: readLogLevel(appEnv),
    maxBookings: readMaxBookings(),
    adminApiKey: process.env.ADMIN_API_KEY || undefined,
    version: pkg.version,
  };
}
