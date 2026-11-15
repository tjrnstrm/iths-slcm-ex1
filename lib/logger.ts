/**
 * Minimal leveled logger.
 *
 * Every line has the shape:  [2026-11-11T12:00:00.000Z] INFO  message {"key":"value"}
 * Output goes through console.* so it lands on stdout/stderr, which is what
 * Docker and Render capture as logs. LOG_LEVEL controls what gets printed.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
export type LogLevel = keyof typeof LEVELS;

export function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === 'string' && value in LEVELS;
}

function currentLevel(): LogLevel {
  const fromEnv = process.env.LOG_LEVEL?.toLowerCase();
  if (isLogLevel(fromEnv)) return fromEnv;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

type Context = Record<string, unknown>;

function serializeError(err: unknown) {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { message: String(err) };
}

function format(level: LogLevel, message: string, context?: Context) {
  const time = new Date().toISOString();
  const tag = level.toUpperCase().padEnd(5);
  let ctx = '';
  if (context && Object.keys(context).length > 0) {
    const safe = { ...context };
    if ('error' in safe) safe.error = serializeError(safe.error);
    ctx = ' ' + JSON.stringify(safe);
  }
  return `[${time}] ${tag} ${message}${ctx}`;
}

function log(level: LogLevel, message: string, context?: Context) {
  if (LEVELS[level] < LEVELS[currentLevel()]) return;
  const line = format(level, message, context);
  switch (level) {
    case 'debug':
      console.debug(line);
      break;
    case 'info':
      console.info(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    case 'error':
      console.error(line);
      break;
  }
}

export type Logger = {
  debug: (message: string, context?: Context) => void;
  info: (message: string, context?: Context) => void;
  warn: (message: string, context?: Context) => void;
  error: (message: string, context?: Context) => void;
  /** Returns a logger that adds `bound` (e.g. a requestId) to every line. */
  child: (bound: Context) => Logger;
};

function createLogger(bound: Context = {}): Logger {
  const withBound = (context?: Context) => ({ ...bound, ...context });
  return {
    debug: (message, context) => log('debug', message, withBound(context)),
    info: (message, context) => log('info', message, withBound(context)),
    warn: (message, context) => log('warn', message, withBound(context)),
    error: (message, context) => log('error', message, withBound(context)),
    child: (more) => createLogger({ ...bound, ...more }),
  };
}

export const logger = createLogger();

/**
 * Logger for one HTTP request. Reuses an incoming x-request-id header if a
 * proxy set one, otherwise generates a new id. The same id is returned to the
 * client in the x-request-id response header, so a user-reported error can be
 * matched to the exact log lines in Render.
 */
export function requestLogger(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const { pathname } = new URL(request.url);
  return {
    requestId,
    log: logger.child({ requestId, method: request.method, path: pathname }),
  };
}
