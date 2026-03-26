import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { getClients, getClient, createClient, updateClient, deleteClient } from '../services/client.service.js';
import { getClientStats } from '../services/clientStats.service.js';
import { requireAuth } from '../middleware/requireAuth.js';

const createClientSchema = {
  body: Type.Object({
    name: Type.String({ minLength: 1 }),
    addressStreet: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    addressZip: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    addressCity: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    contactPerson: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    email: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    phone: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    notes: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  }),
};

const updateClientSchema = {
  body: Type.Object({
    name: Type.Optional(Type.String({ minLength: 1 })),
    addressStreet: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    addressZip: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    addressCity: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    contactPerson: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    email: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    phone: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    notes: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  }),
};

export async function clientRoutes(app: FastifyInstance) {
  app.get('/api/clients', { preHandler: [requireAuth] }, async (request, reply) => {
    const { search } = request.query as { search?: string };
    const result = await getClients(request.userId, search);
    return reply.send({ data: result });
  });

  app.get('/api/clients/:id/stats', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).userId;
    const result = await getClientStats(userId, id);
    return reply.send({ data: result });
  });

  app.get('/api/clients/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getClient(request.userId, id);
    return reply.send({ data: result });
  });

  app.post('/api/clients', { preHandler: [requireAuth], schema: createClientSchema }, async (request, reply) => {
    const data = request.body as Record<string, unknown>;
    const result = await createClient(request.userId, data as any);
    return reply.status(201).send({ data: result });
  });

  app.put('/api/clients/:id', { preHandler: [requireAuth], schema: updateClientSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as Record<string, unknown>;
    const result = await updateClient(request.userId, id, data as any);
    return reply.send({ data: result });
  });

  app.delete('/api/clients/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteClient(request.userId, id);
    return reply.send({ data: { message: 'Client deleted' } });
  });
}
