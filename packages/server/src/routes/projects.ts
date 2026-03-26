import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { getProjects, getProject, createProject, updateProject, deleteProject } from '../services/project.service.js';
import { requireAuth } from '../middleware/requireAuth.js';

const createProjectSchema = {
  body: Type.Object({
    name: Type.String({ minLength: 1 }),
    clientId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    status: Type.Optional(Type.Union([Type.Literal('active'), Type.Literal('completed')])),
    startDate: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    endDate: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    notes: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  }),
};

const updateProjectSchema = {
  body: Type.Object({
    name: Type.Optional(Type.String({ minLength: 1 })),
    clientId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    status: Type.Optional(Type.Union([Type.Literal('active'), Type.Literal('completed')])),
    startDate: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    endDate: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    notes: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  }),
};

export async function projectRoutes(app: FastifyInstance) {
  app.get('/api/projects', { preHandler: [requireAuth] }, async (request, reply) => {
    const { client_id, status } = request.query as { client_id?: string; status?: string };
    const result = await getProjects(request.userId, client_id, status);
    return reply.send({ data: result });
  });

  app.get('/api/projects/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getProject(request.userId, id);
    return reply.send({ data: result });
  });

  app.post('/api/projects', { preHandler: [requireAuth], schema: createProjectSchema }, async (request, reply) => {
    const data = request.body as Record<string, unknown>;
    const result = await createProject(request.userId, data as any);
    return reply.status(201).send({ data: result });
  });

  app.put('/api/projects/:id', { preHandler: [requireAuth], schema: updateProjectSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as Record<string, unknown>;
    const result = await updateProject(request.userId, id, data as any);
    return reply.send({ data: result });
  });

  app.delete('/api/projects/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteProject(request.userId, id);
    return reply.send({ data: { message: 'Project deleted' } });
  });
}
