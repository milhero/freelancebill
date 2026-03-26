import type { FastifyInstance } from 'fastify';
import { getDashboardData } from '../services/dashboard.service.js';
import { requireAuth } from '../middleware/requireAuth.js';

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/api/dashboard', { preHandler: [requireAuth] }, async (request, reply) => {
    const result = await getDashboardData(request.userId);
    return reply.send({ data: result });
  });
}
