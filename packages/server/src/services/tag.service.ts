import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tags } from '../db/schema/tags.js';
import { NotFoundError } from '../utils/errors.js';

type TagCreate = {
  name: string;
  color?: string;
};

export async function getTags(userId: string) {
  return db
    .select()
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(tags.name);
}

export async function createTag(userId: string, data: TagCreate) {
  const [created] = await db
    .insert(tags)
    .values({
      userId,
      name: data.name,
      color: data.color || '#6366f1',
    })
    .returning();

  return created;
}

export async function updateTag(
  userId: string,
  tagId: string,
  data: Partial<TagCreate>,
) {
  const [updated] = await db
    .update(tags)
    .set(data)
    .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
    .returning();

  if (!updated) {
    throw new NotFoundError('Tag');
  }

  return updated;
}

export async function deleteTag(userId: string, tagId: string) {
  const [deleted] = await db
    .delete(tags)
    .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
    .returning();

  if (!deleted) {
    throw new NotFoundError('Tag');
  }

  return deleted;
}
