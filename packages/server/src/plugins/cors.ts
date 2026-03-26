import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { config } from '../config.js';

export async function registerCors(app: FastifyInstance) {
  await app.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });
}
