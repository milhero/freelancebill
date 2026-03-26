import type { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import { config } from '../config.js';

declare module 'fastify' {
  interface Session {
    userId?: string;
  }
}

export async function registerAuth(app: FastifyInstance) {
  await app.register(fastifyCookie);

  await app.register(fastifySession, {
    secret: config.sessionSecret,
    cookie: {
      secure: config.nodeEnv === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    },
    saveUninitialized: false,
  });
}
