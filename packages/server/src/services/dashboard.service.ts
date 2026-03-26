import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { invoices } from '../db/schema/invoices.js';
import { expenses } from '../db/schema/expenses.js';
import { settings } from '../db/schema/settings.js';
import { clients } from '../db/schema/clients.js';

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function getDashboardData(userId: string) {
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;
  const prevYearStart = `${currentYear - 1}-01-01`;
  const prevYearEnd = `${currentYear - 1}-12-31`;
  const today = new Date().toISOString().split('T')[0];

  // 1. Total revenue: sum of totalAmount where status='paid' and invoiceDate in current year
  const [revenueRow] = await db
    .select({
      total: sql<string>`coalesce(sum(${invoices.totalAmount}), 0)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, userId),
        eq(invoices.status, 'paid'),
        gte(invoices.invoiceDate, yearStart),
        lte(invoices.invoiceDate, yearEnd),
      ),
    );
  const totalRevenue = parseFloat(revenueRow?.total || '0');

  // 2. Total expenses: sum of amount where date in current year
  const [expenseRow] = await db
    .select({
      total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        gte(expenses.date, yearStart),
        lte(expenses.date, yearEnd),
      ),
    );
  const totalExpenses = parseFloat(expenseRow?.total || '0');

  // 3. Profit/Loss
  const profitLoss = totalRevenue - totalExpenses;

  // 4. Open invoices: count and sum where status='open'
  const [openRow] = await db
    .select({
      count: sql<string>`count(*)`,
      total: sql<string>`coalesce(sum(${invoices.totalAmount}), 0)`,
    })
    .from(invoices)
    .where(and(eq(invoices.userId, userId), eq(invoices.status, 'open')));
  const openInvoices = {
    count: parseInt(openRow?.count || '0', 10),
    total: parseFloat(openRow?.total || '0'),
  };

  // 5. Tax-free remaining
  const [settingsRow] = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId))
    .limit(1);
  const taxFreeAllowance = settingsRow
    ? parseFloat(settingsRow.taxFreeAllowance as string)
    : 11784;
  const taxFreeRemaining = taxFreeAllowance - totalRevenue;

  // 6. Overdue invoices
  const overdueRows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      totalAmount: invoices.totalAmount,
      paymentDueDate: invoices.paymentDueDate,
      clientName: clients.name,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(
      and(
        eq(invoices.userId, userId),
        eq(invoices.status, 'open'),
        lte(invoices.paymentDueDate, today),
      ),
    );

  const overdueInvoices = overdueRows.map((row) => {
    const dueDate = new Date(row.paymentDueDate);
    const todayDate = new Date(today);
    const daysSinceDue = Math.floor(
      (todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    return {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      totalAmount: parseFloat(row.totalAmount as string),
      paymentDueDate: row.paymentDueDate,
      clientName: row.clientName,
      daysSinceDue,
    };
  });

  // 7. Monthly data
  const monthlyRevenue = await db
    .select({
      month: sql<string>`extract(month from ${invoices.invoiceDate})::int`,
      total: sql<string>`coalesce(sum(${invoices.totalAmount}), 0)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, userId),
        eq(invoices.status, 'paid'),
        gte(invoices.invoiceDate, yearStart),
        lte(invoices.invoiceDate, yearEnd),
      ),
    )
    .groupBy(sql`extract(month from ${invoices.invoiceDate})`);

  const monthlyExpenses = await db
    .select({
      month: sql<string>`extract(month from ${expenses.date})::int`,
      total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        gte(expenses.date, yearStart),
        lte(expenses.date, yearEnd),
      ),
    )
    .groupBy(sql`extract(month from ${expenses.date})`);

  const revenueByMonth = new Map(
    monthlyRevenue.map((r) => [parseInt(r.month, 10), parseFloat(r.total)]),
  );
  const expensesByMonth = new Map(
    monthlyExpenses.map((r) => [parseInt(r.month, 10), parseFloat(r.total)]),
  );

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      month: `${currentYear}-${month.toString().padStart(2, '0')}`,
      revenue: revenueByMonth.get(month) || 0,
      expenses: expensesByMonth.get(month) || 0,
    };
  });

  // 8. Year comparison — previous year revenue & expenses
  const [prevRevenueRow] = await db
    .select({
      total: sql<string>`coalesce(sum(${invoices.totalAmount}), 0)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, userId),
        eq(invoices.status, 'paid'),
        gte(invoices.invoiceDate, prevYearStart),
        lte(invoices.invoiceDate, prevYearEnd),
      ),
    );
  const prevRevenue = parseFloat(prevRevenueRow?.total || '0');

  const [prevExpenseRow] = await db
    .select({
      total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        gte(expenses.date, prevYearStart),
        lte(expenses.date, prevYearEnd),
      ),
    );
  const prevExpenses = parseFloat(prevExpenseRow?.total || '0');
  const prevProfit = prevRevenue - prevExpenses;

  const yearComparison = {
    currentYear: { revenue: totalRevenue, expenses: totalExpenses, profit: profitLoss },
    previousYear: { revenue: prevRevenue, expenses: prevExpenses, profit: prevProfit },
    revenueChange: pctChange(totalRevenue, prevRevenue),
    expensesChange: pctChange(totalExpenses, prevExpenses),
    profitChange: pctChange(profitLoss, prevProfit),
  };

  // 9. Top clients — top 5 by paid invoice amount this year
  const topClientsRows = await db
    .select({
      clientId: invoices.clientId,
      clientName: clients.name,
      totalRevenue: sql<string>`coalesce(sum(${invoices.totalAmount}), 0)`,
      invoiceCount: sql<string>`count(*)`,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(
      and(
        eq(invoices.userId, userId),
        eq(invoices.status, 'paid'),
        gte(invoices.invoiceDate, yearStart),
        lte(invoices.invoiceDate, yearEnd),
      ),
    )
    .groupBy(invoices.clientId, clients.name)
    .orderBy(desc(sql`sum(${invoices.totalAmount})`))
    .limit(5);

  const topClients = topClientsRows.map((r) => ({
    clientId: r.clientId,
    clientName: r.clientName || 'Unknown',
    totalRevenue: parseFloat(r.totalRevenue),
    invoiceCount: parseInt(r.invoiceCount, 10),
  }));

  // 10. Aging report — categorize open invoices by overdue age
  const openInvoiceRows = await db
    .select({
      totalAmount: invoices.totalAmount,
      paymentDueDate: invoices.paymentDueDate,
    })
    .from(invoices)
    .where(
      and(eq(invoices.userId, userId), eq(invoices.status, 'open')),
    );

  const agingReport = {
    current: { count: 0, total: 0 },
    days30: { count: 0, total: 0 },
    days60: { count: 0, total: 0 },
    days90: { count: 0, total: 0 },
    days90plus: { count: 0, total: 0 },
  };

  const todayDate = new Date(today);
  for (const row of openInvoiceRows) {
    const amount = parseFloat(row.totalAmount as string);
    const dueDate = new Date(row.paymentDueDate);
    const daysOverdue = Math.floor(
      (todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysOverdue <= 0) {
      agingReport.current.count++;
      agingReport.current.total += amount;
    } else if (daysOverdue <= 30) {
      agingReport.days30.count++;
      agingReport.days30.total += amount;
    } else if (daysOverdue <= 60) {
      agingReport.days60.count++;
      agingReport.days60.total += amount;
    } else if (daysOverdue <= 90) {
      agingReport.days90.count++;
      agingReport.days90.total += amount;
    } else {
      agingReport.days90plus.count++;
      agingReport.days90plus.total += amount;
    }
  }

  return {
    totalRevenue,
    totalExpenses,
    profitLoss,
    openInvoicesCount: openInvoices.count,
    openInvoicesTotal: openInvoices.total,
    taxFreeRemaining,
    overdueInvoices,
    monthlyData,
    yearComparison,
    topClients,
    agingReport,
  };
}
