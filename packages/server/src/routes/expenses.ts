import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../services/expense.service.js';
import { requireAuth } from '../middleware/requireAuth.js';

const createExpenseSchema = {
  body: Type.Object({
    date: Type.String(),
    description: Type.String({ minLength: 1 }),
    amount: Type.Number(),
    paymentMethod: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    notes: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    tagIds: Type.Optional(Type.Array(Type.String())),
  }),
};

const updateExpenseSchema = {
  body: Type.Object({
    date: Type.Optional(Type.String()),
    description: Type.Optional(Type.String({ minLength: 1 })),
    amount: Type.Optional(Type.Number()),
    paymentMethod: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    notes: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    tagIds: Type.Optional(Type.Array(Type.String())),
  }),
};

export async function expenseRoutes(app: FastifyInstance) {
  app.get('/api/expenses', { preHandler: [requireAuth] }, async (request, reply) => {
    const { tag_id, from, to } = request.query as {
      tag_id?: string;
      from?: string;
      to?: string;
    };
    const result = await getExpenses(request.userId, {
      tagId: tag_id,
      from,
      to,
    });
    return reply.send({ data: result });
  });

  app.get('/api/expenses/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getExpense(request.userId, id);
    return reply.send({ data: result });
  });

  app.post('/api/expenses', { preHandler: [requireAuth], schema: createExpenseSchema }, async (request, reply) => {
    const data = request.body as {
      date: string;
      description: string;
      amount: number;
      paymentMethod?: string | null;
      notes?: string | null;
      tagIds?: string[];
    };
    const result = await createExpense(request.userId, data);
    return reply.status(201).send({ data: result });
  });

  app.put('/api/expenses/:id', { preHandler: [requireAuth], schema: updateExpenseSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as Record<string, unknown>;
    const result = await updateExpense(request.userId, id, data as any);
    return reply.send({ data: result });
  });

  app.delete('/api/expenses/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteExpense(request.userId, id);
    return reply.send({ data: { message: 'Expense deleted' } });
  });
}
