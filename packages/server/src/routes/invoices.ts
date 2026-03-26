import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  updateInvoiceStatus,
} from '../services/invoice.service.js';
import { processRecurringInvoices } from '../services/recurring.service.js';

const CreateInvoiceSchema = Type.Object({
  clientId: Type.String(),
  projectId: Type.Optional(Type.String()),
  invoiceDate: Type.Optional(Type.String()),
  paymentDays: Type.Optional(Type.Number()),
  description: Type.String(),
  projectSubtitle: Type.Optional(Type.String()),
  billingType: Type.Union([Type.Literal('hourly'), Type.Literal('fixed')]),
  hours: Type.Optional(Type.Number()),
  hourlyRate: Type.Optional(Type.Number()),
  fixedAmount: Type.Optional(Type.Number()),
  isRecurring: Type.Optional(Type.Boolean()),
  recurringInterval: Type.Optional(
    Type.Union([Type.Literal('monthly'), Type.Literal('quarterly'), Type.Literal('yearly')]),
  ),
  notes: Type.Optional(Type.String()),
});

const UpdateInvoiceSchema = Type.Partial(CreateInvoiceSchema);

const StatusUpdateSchema = Type.Object({
  status: Type.String(),
  paidDate: Type.Optional(Type.String()),
});

export async function invoiceRoutes(app: FastifyInstance) {
  // GET /api/invoices
  app.get(
    '/api/invoices',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { status, client_id, year } = request.query as {
        status?: string;
        client_id?: string;
        year?: string;
      };

      const userId = (request as any).userId;
      const result = await getInvoices(userId, {
        status,
        clientId: client_id,
        year,
      });

      return reply.send({ data: result });
    },
  );

  // GET /api/invoices/:id
  app.get(
    '/api/invoices/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = (request as any).userId;
      const result = await getInvoice(userId, id);
      return reply.send({ data: result });
    },
  );

  // POST /api/invoices
  app.post(
    '/api/invoices',
    {
      preHandler: [requireAuth],
      schema: { body: CreateInvoiceSchema },
    },
    async (request, reply) => {
      const userId = (request as any).userId;
      const result = await createInvoice(userId, request.body as any);
      return reply.code(201).send({ data: result });
    },
  );

  // POST /api/invoices/process-recurring
  app.post(
    '/api/invoices/process-recurring',
    { preHandler: [requireAuth] },
    async (_request, reply) => {
      const results = await processRecurringInvoices();
      return reply.send({ data: results, message: `${results.length} recurring invoice(s) processed` });
    },
  );

  // PUT /api/invoices/:id
  app.put(
    '/api/invoices/:id',
    {
      preHandler: [requireAuth],
      schema: { body: UpdateInvoiceSchema },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = (request as any).userId;
      const result = await updateInvoice(userId, id, request.body as any);
      return reply.send({ data: result });
    },
  );

  // DELETE /api/invoices/:id
  app.delete(
    '/api/invoices/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = (request as any).userId;
      await deleteInvoice(userId, id);
      return reply.send({ data: { message: 'Deleted' } });
    },
  );

  // POST /api/invoices/:id/status
  app.post(
    '/api/invoices/:id/status',
    {
      preHandler: [requireAuth],
      schema: { body: StatusUpdateSchema },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = (request as any).userId;
      const result = await updateInvoiceStatus(userId, id, request.body as any);
      return reply.send({ data: result });
    },
  );
}
