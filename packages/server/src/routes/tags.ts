import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { getTags, createTag, updateTag, deleteTag } from '../services/tag.service.js';
import { requireAuth } from '../middleware/requireAuth.js';

const createTagSchema = {
  body: Type.Object({
    name: Type.String({ minLength: 1 }),
    color: Type.Optional(Type.String()),
  }),
};

const updateTagSchema = {
  body: Type.Object({
    name: Type.Optional(Type.String({ minLength: 1 })),
    color: Type.Optional(Type.String()),
  }),
};

export async function tagRoutes(app: FastifyInstance) {
  app.get('/api/tags', { preHandler: [requireAuth] }, async (request, reply) => {
    const result = await getTags(request.userId);
    return reply.send({ data: result });
  });

  app.post('/api/tags', { preHandler: [requireAuth], schema: createTagSchema }, async (request, reply) => {
    const data = request.body as { name: string; color?: string };
    const result = await createTag(request.userId, data);
    return reply.status(201).send({ data: result });
  });

  app.put('/api/tags/:id', { preHandler: [requireAuth], schema: updateTagSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as { name?: string; color?: string };
    const result = await updateTag(request.userId, id, data);
    return reply.send({ data: result });
  });

  app.delete('/api/tags/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteTag(request.userId, id);
    return reply.send({ data: { message: 'Tag deleted' } });
  });
}
