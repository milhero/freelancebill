import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/requireAuth.js';
import { getDocuments, getDocument, createDocument, deleteDocument } from '../services/document.service.js';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';

const DOCUMENTS_DIR = join(process.cwd(), 'uploads', 'documents');

export async function documentRoutes(app: FastifyInstance) {
  await mkdir(DOCUMENTS_DIR, { recursive: true });

  // GET /api/documents — list with optional filters
  app.get('/api/documents', { preHandler: [requireAuth] }, async (request) => {
    const userId = request.userId;
    const { type, year } = request.query as { type?: string; year?: string };

    const docs = await getDocuments(userId, { type, year });
    return { data: docs };
  });

  // POST /api/documents — multipart upload
  app.post('/api/documents', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.userId;

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    // Validate file type
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(data.mimetype)) {
      return reply.status(400).send({ error: 'Only JPEG, PNG, WebP and PDF allowed' });
    }

    // Get form fields from multipart
    const fields = data.fields as Record<string, any>;
    const name = fields.name?.value || data.filename;
    const type = fields.type?.value || 'other';

    const ext = data.filename.split('.').pop() || 'bin';
    const filename = `${randomUUID()}.${ext}`;
    const filepath = join(DOCUMENTS_DIR, filename);

    const buffer = await data.toBuffer();
    await writeFile(filepath, buffer);

    const filePath = `/uploads/documents/${filename}`;

    const doc = await createDocument(userId, {
      name,
      type,
      filePath,
      fileSize: buffer.length,
      mimeType: data.mimetype,
    });

    return { data: doc };
  });

  // GET /api/documents/:id/file — serve file for download/view
  app.get('/api/documents/:id/file', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.userId;

    const doc = await getDocument(userId, id);

    const filepath = join(process.cwd(), doc.filePath.replace(/^\//, ''));

    try {
      const fileStat = await stat(filepath);
      if (!fileStat.isFile()) {
        return reply.status(404).send({ error: 'File not found' });
      }
    } catch {
      return reply.status(404).send({ error: 'File not found' });
    }

    reply.header('Content-Type', doc.mimeType || 'application/octet-stream');
    reply.header('Content-Disposition', `inline; filename="${doc.name}"`);

    const stream = createReadStream(filepath);
    return reply.send(stream);
  });

  // DELETE /api/documents/:id — delete document and file
  app.delete('/api/documents/:id', { preHandler: [requireAuth] }, async (request) => {
    const { id } = request.params as { id: string };
    const userId = request.userId;

    const result = await deleteDocument(userId, id);
    return { data: result };
  });
}
