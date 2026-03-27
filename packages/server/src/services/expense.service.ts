import { eq, and, gte, lte, desc, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { expenses } from '../db/schema/expenses.js';
import { tags, expenseTags } from '../db/schema/tags.js';
import { NotFoundError } from '../utils/errors.js';
import type { ExpenseCreate } from '@freelancebill/shared';

function parseExpense(row: typeof expenses.$inferSelect) {
  return {
    ...row,
    amount: parseFloat(row.amount as string),
  };
}

async function attachTags(expenseIds: string[]) {
  if (expenseIds.length === 0) return new Map<string, typeof tags.$inferSelect[]>();

  const rows = await db
    .select({
      expenseId: expenseTags.expenseId,
      tagId: tags.id,
      tagName: tags.name,
      tagColor: tags.color,
      tagCreatedAt: tags.createdAt,
      tagUserId: tags.userId,
    })
    .from(expenseTags)
    .innerJoin(tags, eq(expenseTags.tagId, tags.id))
    .where(inArray(expenseTags.expenseId, expenseIds));

  const map = new Map<string, { id: string; name: string; color: string }[]>();
  for (const row of rows) {
    const list = map.get(row.expenseId) || [];
    list.push({ id: row.tagId, name: row.tagName, color: row.tagColor });
    map.set(row.expenseId, list);
  }
  return map;
}

export async function getExpenses(
  userId: string,
  filters?: { tagId?: string; from?: string; to?: string },
) {
  const conditions = [eq(expenses.userId, userId)];

  if (filters?.from) {
    conditions.push(gte(expenses.date, filters.from));
  }
  if (filters?.to) {
    conditions.push(lte(expenses.date, filters.to));
  }

  let expenseRows = await db
    .select()
    .from(expenses)
    .where(and(...conditions))
    .orderBy(desc(expenses.date));

  // If filtering by tag, get matching expense IDs first
  if (filters?.tagId) {
    const taggedExpenseIds = await db
      .select({ expenseId: expenseTags.expenseId })
      .from(expenseTags)
      .where(eq(expenseTags.tagId, filters.tagId));

    const idSet = new Set(taggedExpenseIds.map((r) => r.expenseId));
    expenseRows = expenseRows.filter((e) => idSet.has(e.id));
  }

  const tagMap = await attachTags(expenseRows.map((e) => e.id));

  return expenseRows.map((row) => ({
    ...parseExpense(row),
    tags: tagMap.get(row.id) || [],
  }));
}

export async function getExpense(userId: string, expenseId: string) {
  const [row] = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.userId, userId)))
    .limit(1);

  if (!row) {
    throw new NotFoundError('Expense');
  }

  const tagMap = await attachTags([row.id]);

  return {
    ...parseExpense(row),
    tags: tagMap.get(row.id) || [],
  };
}

export async function createExpense(userId: string, data: ExpenseCreate) {
  const [created] = await db
    .insert(expenses)
    .values({
      userId,
      date: data.date,
      description: data.description,
      amount: data.amount.toString(),
      paymentMethod: data.paymentMethod || null,
      notes: data.notes || null,
    })
    .returning();

  // Link tags
  if (data.tagIds && data.tagIds.length > 0) {
    await db.insert(expenseTags).values(
      data.tagIds.map((tagId) => ({
        expenseId: created.id,
        tagId,
      })),
    );
  }

  const tagMap = await attachTags([created.id]);

  return {
    ...parseExpense(created),
    tags: tagMap.get(created.id) || [],
  };
}

export async function updateExpense(
  userId: string,
  expenseId: string,
  data: Partial<ExpenseCreate>,
) {
  const [existing] = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.userId, userId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Expense');
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.date !== undefined) updateData.date = data.date;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.amount !== undefined) updateData.amount = data.amount.toString();
  if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod || null;
  if (data.notes !== undefined) updateData.notes = data.notes || null;

  const [updated] = await db
    .update(expenses)
    .set(updateData)
    .where(and(eq(expenses.id, expenseId), eq(expenses.userId, userId)))
    .returning();

  // Re-link tags if provided
  if (data.tagIds !== undefined) {
    await db
      .delete(expenseTags)
      .where(eq(expenseTags.expenseId, expenseId));

    if (data.tagIds.length > 0) {
      await db.insert(expenseTags).values(
        data.tagIds.map((tagId) => ({
          expenseId,
          tagId,
        })),
      );
    }
  }

  const tagMap = await attachTags([updated.id]);

  return {
    ...parseExpense(updated),
    tags: tagMap.get(updated.id) || [],
  };
}

export async function deleteExpense(userId: string, expenseId: string) {
  const [deleted] = await db
    .delete(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.userId, userId)))
    .returning();

  if (!deleted) {
    throw new NotFoundError('Expense');
  }

  return deleted;
}
