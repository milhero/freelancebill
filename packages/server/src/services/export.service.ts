import { db } from '../db/index.js';
import { invoices } from '../db/schema/invoices.js';
import { expenses } from '../db/schema/expenses.js';
import { clients } from '../db/schema/clients.js';
import { tags, expenseTags } from '../db/schema/tags.js';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

const BOM = '\uFEFF';

function toCsvRow(fields: string[]): string {
  return fields.map(f => `"${(f ?? '').toString().replace(/"/g, '""')}"`).join(';') + '\n';
}

function formatAmount(value: string | number): string {
  return parseFloat(value as string).toFixed(2).replace('.', ',');
}

export async function exportIncome(userId: string, year: string): Promise<string> {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const rows = await db
    .select({
      invoiceNumber: invoices.invoiceNumber,
      invoiceDate: invoices.invoiceDate,
      clientName: clients.name,
      description: invoices.description,
      totalAmount: invoices.totalAmount,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(and(
      eq(invoices.userId, userId),
      eq(invoices.status, 'paid'),
      gte(invoices.invoiceDate, yearStart),
      lte(invoices.invoiceDate, yearEnd),
    ))
    .orderBy(desc(invoices.invoiceDate));

  let csv = BOM + toCsvRow(['Rechnungsnr.', 'Datum', 'Kunde', 'Leistung', 'Betrag']);

  for (const row of rows) {
    csv += toCsvRow([
      row.invoiceNumber,
      row.invoiceDate,
      row.clientName || '',
      row.description,
      formatAmount(row.totalAmount),
    ]);
  }

  return csv;
}

export async function exportExpenses(userId: string, year: string): Promise<string> {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const rows = await db
    .select()
    .from(expenses)
    .where(and(
      eq(expenses.userId, userId),
      gte(expenses.date, yearStart),
      lte(expenses.date, yearEnd),
    ))
    .orderBy(desc(expenses.date));

  // Fetch tags for all expenses
  const expenseIds = rows.map(r => r.id);
  let tagMap: Record<string, string[]> = {};

  if (expenseIds.length > 0) {
    const tagRows = await db
      .select({
        expenseId: expenseTags.expenseId,
        tagName: tags.name,
      })
      .from(expenseTags)
      .innerJoin(tags, eq(expenseTags.tagId, tags.id));

    for (const t of tagRows) {
      if (expenseIds.includes(t.expenseId)) {
        if (!tagMap[t.expenseId]) tagMap[t.expenseId] = [];
        tagMap[t.expenseId].push(t.tagName);
      }
    }
  }

  let csv = BOM + toCsvRow(['Datum', 'Beschreibung', 'Betrag', 'Zahlungsmethode', 'Tags']);

  for (const row of rows) {
    csv += toCsvRow([
      row.date,
      row.description,
      formatAmount(row.amount),
      row.paymentMethod || '',
      (tagMap[row.id] || []).join(', '),
    ]);
  }

  return csv;
}

export async function exportSummary(userId: string, year: string): Promise<string> {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const incomeRows = await db
    .select({
      invoiceDate: invoices.invoiceDate,
      totalAmount: invoices.totalAmount,
    })
    .from(invoices)
    .where(and(
      eq(invoices.userId, userId),
      eq(invoices.status, 'paid'),
      gte(invoices.invoiceDate, yearStart),
      lte(invoices.invoiceDate, yearEnd),
    ));

  const expenseRows = await db
    .select({
      date: expenses.date,
      amount: expenses.amount,
    })
    .from(expenses)
    .where(and(
      eq(expenses.userId, userId),
      gte(expenses.date, yearStart),
      lte(expenses.date, yearEnd),
    ));

  // Aggregate by month
  const months: Record<string, { revenue: number; expenses: number }> = {};
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${m.toString().padStart(2, '0')}`;
    months[key] = { revenue: 0, expenses: 0 };
  }

  for (const row of incomeRows) {
    const month = row.invoiceDate.substring(0, 7);
    if (months[month]) months[month].revenue += parseFloat(row.totalAmount as string);
  }

  for (const row of expenseRows) {
    const month = row.date.substring(0, 7);
    if (months[month]) months[month].expenses += parseFloat(row.amount as string);
  }

  let csv = BOM + toCsvRow(['Monat', 'Einnahmen', 'Ausgaben', 'Gewinn']);

  let totalRevenue = 0;
  let totalExpenses = 0;

  for (const [month, data] of Object.entries(months).sort()) {
    const profit = data.revenue - data.expenses;
    totalRevenue += data.revenue;
    totalExpenses += data.expenses;
    csv += toCsvRow([
      month,
      formatAmount(data.revenue),
      formatAmount(data.expenses),
      formatAmount(profit),
    ]);
  }

  // Total row
  csv += toCsvRow([
    'GESAMT',
    formatAmount(totalRevenue),
    formatAmount(totalExpenses),
    formatAmount(totalRevenue - totalExpenses),
  ]);

  return csv;
}
