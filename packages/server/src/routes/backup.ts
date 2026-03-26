import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/requireAuth.js';
import { exportBackup, importBackup } from '../services/backup.service.js';

export async function backupRoutes(app: FastifyInstance) {
  app.get('/api/backup', { preHandler: [requireAuth] }, async (request, reply) => {
    const zipBuffer = await exportBackup(request.userId);
    const date = new Date().toISOString().split('T')[0];
    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', `attachment; filename="freelancebill-backup-${date}.zip"`);
    return reply.send(zipBuffer);
  });

  app.post('/api/backup/restore', { preHandler: [requireAuth] }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }
    const buffer = await file.toBuffer();
    const result = await importBackup(request.userId, buffer);
    return reply.send({ data: result });
  });
}
