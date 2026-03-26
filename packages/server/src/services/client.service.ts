import { eq, and, ilike } from 'drizzle-orm';
import { db } from '../db/index.js';
import { clients } from '../db/schema/clients.js';
import { NotFoundError } from '../utils/errors.js';

type ClientCreate = {
  name: string;
  addressStreet?: string | null;
  addressZip?: string | null;
  addressCity?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

export async function getClients(userId: string, search?: string) {
  const query = db
    .select()
    .from(clients)
    .where(
      search
        ? and(eq(clients.userId, userId), ilike(clients.name, `%${search}%`))
        : eq(clients.userId, userId),
    )
    .orderBy(clients.name);

  return query;
}

export async function getClient(userId: string, clientId: string) {
  const [row] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
    .limit(1);

  if (!row) {
    throw new NotFoundError('Client');
  }

  return row;
}

export async function createClient(userId: string, data: ClientCreate) {
  const [created] = await db
    .insert(clients)
    .values({ ...data, userId })
    .returning();

  return created;
}

export async function updateClient(userId: string, clientId: string, data: Partial<ClientCreate>) {
  const [updated] = await db
    .update(clients)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
    .returning();

  if (!updated) {
    throw new NotFoundError('Client');
  }

  return updated;
}

export async function deleteClient(userId: string, clientId: string) {
  const [deleted] = await db
    .delete(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
    .returning();

  if (!deleted) {
    throw new NotFoundError('Client');
  }

  return deleted;
}
