import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { invoices } from '../db/schema/invoices.js';
import { projects } from '../db/schema/projects.js';
import { clients } from '../db/schema/clients.js';

export async function getProjectStats(userId: string, projectId: string) {
  // 1. Total revenue: sum of totalAmount where status='paid'
  const [revenueRow] = await db
    .select({
      total: sql<string>`coalesce(sum(${invoices.totalAmount}), 0)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, userId),
        eq(invoices.projectId, projectId),
        eq(invoices.status, 'paid'),
      ),
    );
  const totalRevenue = parseFloat(revenueRow?.total || '0');

  // 2. Total expenses: 0 for now (no projectId on expenses table)
  const totalExpenses = 0;

  // 3. Profit/Loss
  const profitLoss = totalRevenue - totalExpenses;

  // 4. Invoice count
  const [countRow] = await db
    .select({
      count: sql<string>`count(*)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, userId),
        eq(invoices.projectId, projectId),
      ),
    );
  const invoiceCount = parseInt(countRow?.count || '0', 10);

  // 5. All invoices for this project
  const invoiceRows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      invoiceDate: invoices.invoiceDate,
      totalAmount: invoices.totalAmount,
      status: invoices.status,
      description: invoices.description,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, userId),
        eq(invoices.projectId, projectId),
      ),
    )
    .orderBy(desc(invoices.invoiceDate));

  const invoiceList = invoiceRows.map((row) => ({
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    invoiceDate: row.invoiceDate,
    totalAmount: parseFloat(row.totalAmount as string),
    status: row.status,
    description: row.description,
  }));

  // 6. Client name via project
  const [projectRow] = await db
    .select({
      clientId: projects.clientId,
    })
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        eq(projects.id, projectId),
      ),
    );

  let clientName: string | null = null;
  if (projectRow?.clientId) {
    const [clientRow] = await db
      .select({ name: clients.name })
      .from(clients)
      .where(eq(clients.id, projectRow.clientId));
    clientName = clientRow?.name || null;
  }

  return {
    totalRevenue,
    totalExpenses,
    profitLoss,
    invoiceCount,
    invoices: invoiceList,
    clientName,
  };
}
