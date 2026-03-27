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
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://freelancebill:password@localhost:5432/freelancebill',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
} as const;
