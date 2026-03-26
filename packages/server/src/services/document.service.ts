import { db } from '../db/index.js';
import { documents } from '../db/schema/documents.js';
import { eq, and, desc, like } from 'drizzle-orm';
import { NotFoundError } from '../utils/errors.js';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const DOCUMENTS_DIR = join(process.cwd(), 'uploads', 'documents');

// Ensure directory exists on import
mkdir(DOCUMENTS_DIR, { recursive: true }).catch(() => {});

export async function getDocuments(
  userId: string,
  filters?: { type?: string; year?: string },
) {
  const conditions = [eq(documents.userId, userId)];

  if (filters?.type && filters.type !== 'all') {
    conditions.push(eq(documents.type, filters.type));
  }

  if (filters?.year) {
    conditions.push(like(documents.name, `%${filters.year}%`));
  }

  return db
    .select()
    .from(documents)
    .where(and(...conditions))
    .orderBy(desc(documents.uploadedAt));
}

export async function getDocument(userId: string, id: string) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .limit(1);

  if (!doc) {
    throw new NotFoundError('Document not found');
  }

  return doc;
}

export async function createDocument(
  userId: string,
  data: {
    name: string;
    type: string;
    filePath: string;
    fileSize?: number;
    mimeType?: string;
    invoiceId?: string;
  },
) {
  const [created] = await db
    .insert(documents)
    .values({
      userId,
      name: data.name,
      type: data.type,
      filePath: data.filePath,
      fileSize: data.fileSize ?? null,
      mimeType: data.mimeType ?? null,
      invoiceId: data.invoiceId ?? null,
    })
    .returning();

  return created;
}

export async function deleteDocument(userId: string, id: string) {
  const doc = await getDocument(userId, id);

  // Delete file from disk
  const filepath = join(process.cwd(), doc.filePath.replace(/^\//, ''));
  try {
    await unlink(filepath);
  } catch {
    // File may not exist, ignore
  }

  await db
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)));

  return { success: true };
}

export async function autoArchiveInvoice(
  userId: string,
  invoiceId: string,
  pdfBuffer: Uint8Array,
  invoiceNumber: string,
) {
  await mkdir(DOCUMENTS_DIR, { recursive: true });

  const filename = `${randomUUID()}.pdf`;
  const filepath = join(DOCUMENTS_DIR, filename);

  await writeFile(filepath, pdfBuffer);

  const filePath = `/uploads/documents/${filename}`;
  const name = `Rechnung-${invoiceNumber}.pdf`;

  return createDocument(userId, {
    name,
    type: 'invoice_sent',
    filePath,
    fileSize: pdfBuffer.length,
    mimeType: 'application/pdf',
    invoiceId,
  });
}
