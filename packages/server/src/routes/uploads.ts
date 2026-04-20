import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/requireAuth.js';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { db } from '../db/index.js';
import { expenses } from '../db/schema/expenses.js';
import { eq, and } from 'drizzle-orm';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'receipts');

export async function uploadRoutes(app: FastifyInstance) {
  // Ensure upload directory exists
  await mkdir(UPLOAD_DIR, { recursive: true });

  // Upload receipt for an expense
  app.post('/api/expenses/:id/receipt', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.userId;

    // Verify expense belongs to user
    const [expense] = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));

    if (!expense) {
      return reply.status(404).send({ error: 'Not found' });
    }

    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    // Validate file type
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      return reply.status(400).send({ error: 'Only JPEG, PNG, WebP and PDF allowed' });
    }

    // Derive extension from validated MIME type, not user-supplied filename
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
    };
    const ext = mimeToExt[file.mimetype] || 'bin';
    const filename = `${randomUUID()}.${ext}`;
    const filepath = join(UPLOAD_DIR, filename);

    const buffer = await file.toBuffer();
    await writeFile(filepath, buffer);

    // If there was a previous receipt, try to delete the old file
    if (expense.receiptPath) {
      const oldFilepath = join(process.cwd(), expense.receiptPath.replace(/^\//, ''));
      try {
        await unlink(oldFilepath);
      } catch {
        // Old file may not exist, ignore
      }
    }

    // Update expense with receipt path
    const receiptPath = `/uploads/receipts/${filename}`;
    await db
      .update(expenses)
      .set({ receiptPath, updatedAt: new Date() })
      .where(eq(expenses.id, id));

    return { data: { receiptPath } };
  });

  // Delete receipt from expense
  app.delete('/api/expenses/:id/receipt', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.userId;

    const [expense] = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));

    if (!expense) {
      return reply.status(404).send({ error: 'Not found' });
    }

    // Try to delete the file from disk
    if (expense.receiptPath) {
      const filepath = join(process.cwd(), expense.receiptPath.replace(/^\//, ''));
      try {
        await unlink(filepath);
      } catch {
        // File may not exist, ignore
      }
    }

    await db
      .update(expenses)
      .set({ receiptPath: null, updatedAt: new Date() })
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));

    return { data: { success: true } };
  });
}
