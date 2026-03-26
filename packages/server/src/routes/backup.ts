import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/requireAuth.js';
import { exportBackup, importBackup } from '../services/backup.service.js';

export async function backupRoutes(app: FastifyInstance) {
  app.get('/api/backup', { preHandler: [requireAuth] }, async (request, reply) => {
    const backup = await exportBackup(request.userId);
    return reply.send(backup);
  });

  app.post('/api/backup/restore', { preHandler: [requireAuth] }, async (request, reply) => {
    const backup = request.body;
    const result = await importBackup(request.userId, backup);
    return reply.send({ data: result });
  });
}
