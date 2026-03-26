import { db } from '../db/index.js';
import { settings, clients, projects, invoices, expenses, tags, expenseTags } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

export async function exportBackup(userId: string) {
  const [userSettings] = await db.select().from(settings).where(eq(settings.userId, userId));
  const allClients = await db.select().from(clients).where(eq(clients.userId, userId));
  const allProjects = await db.select().from(projects).where(eq(projects.userId, userId));
  const allInvoices = await db.select().from(invoices).where(eq(invoices.userId, userId));
  const allExpenses = await db.select().from(expenses).where(eq(expenses.userId, userId));
  const allTags = await db.select().from(tags).where(eq(tags.userId, userId));

  // Get expense-tag relations for all user expenses
  const allExpenseTags = [];
  for (const expense of allExpenses) {
    const ets = await db.select().from(expenseTags).where(eq(expenseTags.expenseId, expense.id));
    allExpenseTags.push(...ets);
  }

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    data: {
      settings: userSettings || null,
      clients: allClients,
      projects: allProjects,
      invoices: allInvoices,
      expenses: allExpenses,
      tags: allTags,
      expenseTags: allExpenseTags,
    },
  };
}

export async function importBackup(userId: string, backup: any) {
  if (!backup?.version || !backup?.data) {
    throw new Error('Invalid backup format');
  }

  const { data } = backup;

  return await db.transaction(async (tx) => {
    // Delete existing data in reverse dependency order
    // 1. Delete expense_tags (depends on expenses and tags)
    const userExpenses = await tx.select({ id: expenses.id }).from(expenses).where(eq(expenses.userId, userId));
    for (const expense of userExpenses) {
      await tx.delete(expenseTags).where(eq(expenseTags.expenseId, expense.id));
    }

    // 2. Delete expenses
    await tx.delete(expenses).where(eq(expenses.userId, userId));

    // 3. Delete invoices (depends on clients and projects)
    await tx.delete(invoices).where(eq(invoices.userId, userId));

    // 4. Delete projects (depends on clients)
    await tx.delete(projects).where(eq(projects.userId, userId));

    // 5. Delete clients
    await tx.delete(clients).where(eq(clients.userId, userId));

    // 6. Delete tags
    await tx.delete(tags).where(eq(tags.userId, userId));

    // 7. Delete settings
    await tx.delete(settings).where(eq(settings.userId, userId));

    // Re-insert everything from backup, preserving original IDs
    const counts = {
      settings: 0,
      clients: 0,
      projects: 0,
      invoices: 0,
      expenses: 0,
      tags: 0,
      expenseTags: 0,
    };

    // Settings
    if (data.settings) {
      await tx.insert(settings).values({
        ...data.settings,
        userId,
      });
      counts.settings = 1;
    }

    // Clients
    if (data.clients?.length) {
      for (const client of data.clients) {
        await tx.insert(clients).values({
          ...client,
          userId,
        });
      }
      counts.clients = data.clients.length;
    }

    // Projects
    if (data.projects?.length) {
      for (const project of data.projects) {
        await tx.insert(projects).values({
          ...project,
          userId,
        });
      }
      counts.projects = data.projects.length;
    }

    // Invoices
    if (data.invoices?.length) {
      for (const invoice of data.invoices) {
        await tx.insert(invoices).values({
          ...invoice,
          userId,
        });
      }
      counts.invoices = data.invoices.length;
    }

    // Expenses
    if (data.expenses?.length) {
      for (const expense of data.expenses) {
        await tx.insert(expenses).values({
          ...expense,
          userId,
        });
      }
      counts.expenses = data.expenses.length;
    }

    // Tags
    if (data.tags?.length) {
      for (const tag of data.tags) {
        await tx.insert(tags).values({
          ...tag,
          userId,
        });
      }
      counts.tags = data.tags.length;
    }

    // Expense-tag relations
    if (data.expenseTags?.length) {
      for (const et of data.expenseTags) {
        await tx.insert(expenseTags).values({
          id: et.id,
          expenseId: et.expenseId,
          tagId: et.tagId,
        });
      }
      counts.expenseTags = data.expenseTags.length;
    }

    return counts;
  });
}
