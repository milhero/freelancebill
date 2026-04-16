import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { invoices } from '../db/schema/invoices.js';
import { projects } from '../db/schema/projects.js';
import { clients } from '../db/schema/clients.js';

export async function getClientStats(userId: string, clientId: string) {
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  // 1. Total revenue: sum of totalAmount where status='paid'
  const [revenueRow] = await db
    .select({
      total: sql<string>`coalesce(sum(${invoices.totalAmount}), 0)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, userId),
        eq(invoices.clientId, clientId),
        eq(invoices.status, 'paid'),
      ),
    );
  const totalRevenue = parseFloat(revenueRow?.total || '0');

  // 2. Open invoices: count and sum where status='open'
  const [openRow] = await db
    .select({
      count: sql<string>`count(*)`,
      total: sql<string>`coalesce(sum(${invoices.totalAmount}), 0)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, userId),
        eq(invoices.clientId, clientId),
        eq(invoices.status, 'open'),
      ),
    );
  const openInvoicesCount = parseInt(openRow?.count || '0', 10);
  const openInvoicesTotal = parseFloat(openRow?.total || '0');

  // 3. Paid invoices count
  const [paidRow] = await db
    .select({
      count: sql<string>`count(*)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, userId),
        eq(invoices.clientId, clientId),
        eq(invoices.status, 'paid'),
      ),
    );
  const paidInvoicesCount = parseInt(paidRow?.count || '0', 10);

  // 4. Average invoice amount (paid)
  const [avgRow] = await db
    .select({
      avg: sql<string>`coalesce(avg(${invoices.totalAmount}), 0)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, userId),
        eq(invoices.clientId, clientId),
        eq(invoices.status, 'paid'),
      ),
    );
  const averageInvoiceAmount = parseFloat(parseFloat(avgRow?.avg || '0').toFixed(2));

  // 5. Monthly revenue for current year
  const monthlyRevenueRows = await db
    .select({
      month: sql<string>`extract(month from ${invoices.invoiceDate})::int`,
      total: sql<string>`coalesce(sum(${invoices.totalAmount}), 0)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, userId),
        eq(invoices.clientId, clientId),
        eq(invoices.status, 'paid'),
        gte(invoices.invoiceDate, yearStart),
        lte(invoices.invoiceDate, yearEnd),
      ),
    )
    .groupBy(sql`extract(month from ${invoices.invoiceDate})`);

  const revenueByMonth = new Map(
    monthlyRevenueRows.map((r) => [parseInt(r.month, 10), parseFloat(r.total)]),
  );

  const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      month,
      revenue: revenueByMonth.get(month) || 0,
    };
  });

  // 6. All invoices for this client
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
        eq(invoices.clientId, clientId),
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

  // 7. All projects for this client
  const projectRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
    })
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        eq(projects.clientId, clientId),
      ),
    );

  return {
    totalRevenue,
    openInvoicesCount,
    openInvoicesTotal,
    paidInvoicesCount,
    averageInvoiceAmount,
    monthlyRevenue,
    invoices: invoiceList,
    projects: projectRows,
  };
}
