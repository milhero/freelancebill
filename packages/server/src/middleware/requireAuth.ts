import type { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.session?.userId;
  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
  }
  request.userId = userId;
}
