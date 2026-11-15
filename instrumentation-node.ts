import { getConfig } from './lib/config';
import { logger } from './lib/logger';

/** Node.js-only startup logging, imported from instrumentation.ts register(). */
const { appEnv, logLevel, maxBookings, adminApiKey, version } = getConfig();

logger.info('Server started', {
  env: appEnv,
  nodeEnv: process.env.NODE_ENV,
  version,
  node: process.version,
  port: process.env.PORT ?? '3000',
  logLevel,
  maxBookings,
  // Log WHETHER the secret is set, never its value.
  adminApiKeyConfigured: Boolean(adminApiKey),
});
