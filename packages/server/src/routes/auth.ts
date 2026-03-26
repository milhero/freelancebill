import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { eq } from 'drizzle-orm';
import { authenticateUser, getUserById } from '../services/auth.service.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { AppError } from '../utils/errors.js';
import { db } from '../db/index.js';
import { users } from '../db/schema/users.js';
import { verifyPassword, hashPassword } from '../utils/password.js';

const loginSchema = {
  body: Type.Object({
    email: Type.String({ minLength: 1 }),
    password: Type.String({ minLength: 1 }),
  }),
};

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/login', { schema: loginSchema }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    try {
      const user = await authenticateUser(email, password);
      request.session.userId = user.id;
      await new Promise<void>((resolve, reject) => {
        request.session.save((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
      return reply.send({ data: { id: user.id, email: user.email } });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ error: err.message, statusCode: err.statusCode });
      }
      throw err;
    }
  });

  app.post('/api/auth/logout', async (request, reply) => {
    request.session.destroy();
    return reply.send({ data: { message: 'Logged out' } });
  });

  app.get('/api/auth/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = await getUserById(request.userId);
    if (!user) {
      return reply.status(401).send({ error: 'User not found', statusCode: 401 });
    }
    return reply.send({ data: user });
  });

  // Change password
  app.put('/api/auth/password', { preHandler: [requireAuth] }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body as { currentPassword: string; newPassword: string };
    const userId = request.userId;

    if (!currentPassword || !newPassword) {
      return reply.status(400).send({ error: 'Both passwords required' });
    }

    if (newPassword.length < 8) {
      return reply.status(400).send({ error: 'Password must be at least 8 characters' });
    }

    // Get current user
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return reply.status(404).send({ error: 'User not found' });

    // Verify current password
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) return reply.status(401).send({ error: 'Current password is incorrect' });

    // Hash and update
    const hash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash: hash }).where(eq(users.id, userId));

    return { data: { success: true } };
  });
}
