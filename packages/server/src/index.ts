import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import { config } from './config.js';
import { registerCors } from './plugins/cors.js';
import { registerAuth } from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { settingsRoutes } from './routes/settings.js';
import { clientRoutes } from './routes/clients.js';
import { projectRoutes } from './routes/projects.js';
import { invoiceRoutes } from './routes/invoices.js';
import { invoicePdfRoutes } from './routes/invoicePdf.js';
import { tagRoutes } from './routes/tags.js';
import { expenseRoutes } from './routes/expenses.js';
import { uploadRoutes } from './routes/uploads.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { exportRoutes } from './routes/exports.js';
import { backupRoutes } from './routes/backup.js';
import { documentRoutes } from './routes/documents.js';
import { AppError } from './utils/errors.js';
import { processRecurringInvoices } from './services/recurring.service.js';

const app = Fastify({
  logger: {
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
    transport: config.nodeEnv === 'development'
      ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss' } }
      : undefined,
  },
  trustProxy: config.isProduction,
});

// Error handler — never leak stack traces
app.setErrorHandler((error, request, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ error: error.message, statusCode: error.statusCode });
  }
  // Fastify validation errors
  if (error instanceof Error && 'validation' in error) {
    return reply.status(400).send({ error: 'Validation failed', statusCode: 400 });
  }
  request.log.error(error);
  return reply.status(500).send({ error: 'Internal Server Error', statusCode: 500 });
});

// Plugins
await registerCors(app);
await registerAuth(app);
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit
await app.register(fastifyStatic, {
  root: join(process.cwd(), 'uploads'),
  prefix: '/uploads/',
  decorateReply: false,
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
  },
});

// Health check
app.get('/api/health', async () => ({ status: 'ok' }));

// Routes
await app.register(authRoutes);
await app.register(settingsRoutes);
await app.register(clientRoutes);
await app.register(projectRoutes);
await app.register(invoiceRoutes);
await app.register(invoicePdfRoutes);
await app.register(tagRoutes);
await app.register(expenseRoutes);
await app.register(uploadRoutes);
await app.register(dashboardRoutes);
await app.register(exportRoutes);
await app.register(backupRoutes);
await app.register(documentRoutes);

async function start() {
  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`Server running at http://localhost:${config.port}`);

    // Process recurring invoices on startup and then daily
    processRecurringInvoices()
      .then((results) => {
        if (results.length > 0) {
          console.log(`Processed ${results.length} recurring invoice(s) on startup`);
        }
      })
      .catch((err) => console.error('Error processing recurring invoices:', err));

    setInterval(() => {
      processRecurringInvoices()
        .then((results) => {
          if (results.length > 0) {
            console.log(`Processed ${results.length} recurring invoice(s)`);
          }
        })
        .catch((err) => console.error('Error processing recurring invoices:', err));
    }, 24 * 60 * 60 * 1000);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

export { app };
