import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/requireAuth.js';
import { exportIncome, exportExpenses, exportSummary } from '../services/export.service.js';

export async function exportRoutes(app: FastifyInstance) {
  app.get('/api/exports/:type', { preHandler: [requireAuth] }, async (request, reply) => {
    const { type } = request.params as { type: string };
    const { year } = request.query as { year?: string };
    const exportYear = year || new Date().getFullYear().toString();

    let csv: string;
    let filename: string;

    switch (type) {
      case 'income':
        csv = await exportIncome(request.userId, exportYear);
        filename = `einnahmen-${exportYear}.csv`;
        break;
      case 'expenses':
        csv = await exportExpenses(request.userId, exportYear);
        filename = `ausgaben-${exportYear}.csv`;
        break;
      case 'summary':
        csv = await exportSummary(request.userId, exportYear);
        filename = `zusammenfassung-${exportYear}.csv`;
        break;
      default:
        return reply.status(400).send({ error: 'Invalid export type. Use: income, expenses, summary' });
    }

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return reply.send(csv);
  });
}
