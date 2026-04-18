import { db } from '../db/index.js';
import { invoices } from '../db/schema/invoices.js';
import { eq, and, lte, isNotNull } from 'drizzle-orm';
import { generateInvoiceNumber } from './invoiceNumber.service.js';

export async function processRecurringInvoices(userId?: string) {
  const today = new Date().toISOString().split('T')[0];

  // Find recurring invoices due for renewal, scoped to user if provided
  const conditions = [
    eq(invoices.isRecurring, true),
    isNotNull(invoices.recurringNextDate),
    lte(invoices.recurringNextDate, today),
  ];

  if (userId) {
    conditions.push(eq(invoices.userId, userId));
  }

  const dueInvoices = await db
    .select()
    .from(invoices)
    .where(and(...conditions));

  const results = [];

  for (const inv of dueInvoices) {
    // Generate new invoice number
    const invoiceNumber = await generateInvoiceNumber();
    const invoiceDate = today;
    const paymentDueDate = addDaysToDate(invoiceDate, inv.paymentDays ?? 30);

    // Create new invoice (non-recurring copy)
    const [newInvoice] = await db.insert(invoices).values({
      userId: inv.userId,
      clientId: inv.clientId,
      projectId: inv.projectId,
      invoiceNumber,
      invoiceDate,
      paymentDueDate,
      paymentDays: inv.paymentDays ?? 30,
      description: inv.description,
      projectSubtitle: inv.projectSubtitle,
      billingType: inv.billingType,
      hours: inv.hours,
      hourlyRate: inv.hourlyRate,
      fixedAmount: inv.fixedAmount,
      totalAmount: inv.totalAmount,
      status: 'open',
      isRecurring: false,
      notes: inv.notes,
    }).returning();

    // Calculate next recurrence date
    const nextDate = calculateNextDate(inv.recurringNextDate!, inv.recurringInterval!);

    await db.update(invoices)
      .set({ recurringNextDate: nextDate })
      .where(eq(invoices.id, inv.id));

    results.push(newInvoice);
  }

  return results;
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function calculateNextDate(currentDate: string, interval: string): string {
  const d = new Date(currentDate);
  switch (interval) {
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split('T')[0];
}
