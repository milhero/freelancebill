import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

// Validate required env vars in production
if (isProduction) {
  const required = ['DATABASE_URL', 'SESSION_SECRET', 'CORS_ORIGIN'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables in production: ${missing.join(', ')}`);
  }

  // Validate secret strength
  const sessionSecret = process.env.SESSION_SECRET!;
  if (sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters in production');
  }

  // Reject known default/weak values
  const knownDefaults = ['dev-secret-change-in-production', 'change-me-to-a-random-64-char-string-in-production'];
  if (knownDefaults.includes(sessionSecret)) {
    throw new Error('SESSION_SECRET is set to a known default value. Generate a secure secret: openssl rand -hex 32');
  }

  if (process.env.CORS_ORIGIN === '*') {
    throw new Error('CORS_ORIGIN must not be * in production');
  }
}

if (!isProduction && !process.env.DATABASE_URL) {
  console.warn('WARNING: DATABASE_URL not set, using default development connection string');
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv,
  isProduction,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://freelancebill:password@localhost:5432/freelancebill',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
} as const;
