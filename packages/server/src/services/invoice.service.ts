import { db } from '../db/index.js';
import { invoices } from '../db/schema/invoices.js';
import { clients } from '../db/schema/clients.js';
import { settings } from '../db/schema/settings.js';
import { eq, and, like, desc, sql } from 'drizzle-orm';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { generateInvoiceNumber } from './invoiceNumber.service.js';
import { generateInvoicePdf } from './pdf.service.js';
import { autoArchiveInvoice } from './document.service.js';

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function calculateRecurringNextDate(invoiceDate: string, interval: string): string {
  const d = new Date(invoiceDate);
  switch (interval) {
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split('T')[0];
}

function calculateTotal(data: {
  billingType: string;
  hours?: number | null;
  hourlyRate?: number | null;
  fixedAmount?: number | null;
}): number {
  if (data.billingType === 'hourly') {
    const hours = data.hours ?? 0;
    const rate = data.hourlyRate ?? 0;
    return hours * rate;
  }
  return data.fixedAmount ?? 0;
}

export async function getInvoices(
  userId: string,
  filters?: { status?: string; clientId?: string; year?: string },
) {
  const conditions = [eq(invoices.userId, userId)];

  if (filters?.clientId) {
    conditions.push(eq(invoices.clientId, filters.clientId));
  }

  if (filters?.year) {
    conditions.push(like(invoices.invoiceNumber, `${filters.year}-%`));
  }

  if (filters?.status && filters.status !== 'overdue') {
    conditions.push(eq(invoices.status, filters.status));
  }

  if (filters?.status === 'overdue') {
    conditions.push(eq(invoices.status, 'open'));
  }

  const rows = await db
    .select({
      id: invoices.id,
      userId: invoices.userId,
      clientId: invoices.clientId,
      projectId: invoices.projectId,
      invoiceNumber: invoices.invoiceNumber,
      invoiceDate: invoices.invoiceDate,
      paymentDueDate: invoices.paymentDueDate,
      paymentDays: invoices.paymentDays,
      status: invoices.status,
      paidDate: invoices.paidDate,
      description: invoices.description,
      projectSubtitle: invoices.projectSubtitle,
      billingType: invoices.billingType,
      hours: invoices.hours,
      hourlyRate: invoices.hourlyRate,
      fixedAmount: invoices.fixedAmount,
      totalAmount: invoices.totalAmount,
      isRecurring: invoices.isRecurring,
      recurringInterval: invoices.recurringInterval,
      notes: invoices.notes,
      reminderCount: invoices.reminderCount,
      lastReminderDate: invoices.lastReminderDate,
      serviceDate: invoices.serviceDate,
      servicePeriodStart: invoices.servicePeriodStart,
      servicePeriodEnd: invoices.servicePeriodEnd,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
      clientName: clients.name,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(and(...conditions))
    .orderBy(desc(invoices.invoiceDate));

  const today = new Date().toISOString().split('T')[0];

  const result = rows.map((row) => {
    const isOverdue =
      row.status === 'open' && row.paymentDueDate && row.paymentDueDate < today;
    return {
      ...row,
      hours: row.hours ? parseFloat(row.hours as string) : null,
      hourlyRate: row.hourlyRate ? parseFloat(row.hourlyRate as string) : null,
      fixedAmount: row.fixedAmount ? parseFloat(row.fixedAmount as string) : null,
      totalAmount: row.totalAmount ? parseFloat(row.totalAmount as string) : null,
      overdue: isOverdue,
    };
  });

  // If filtering for overdue, only return actually overdue invoices
  if (filters?.status === 'overdue') {
    return result.filter((r) => r.overdue);
  }

  return result;
}

export async function getInvoice(userId: string, invoiceId: string) {
  const [row] = await db
    .select({
      id: invoices.id,
      userId: invoices.userId,
      clientId: invoices.clientId,
      projectId: invoices.projectId,
      invoiceNumber: invoices.invoiceNumber,
      invoiceDate: invoices.invoiceDate,
      paymentDueDate: invoices.paymentDueDate,
      paymentDays: invoices.paymentDays,
      status: invoices.status,
      paidDate: invoices.paidDate,
      description: invoices.description,
      projectSubtitle: invoices.projectSubtitle,
      billingType: invoices.billingType,
      hours: invoices.hours,
      hourlyRate: invoices.hourlyRate,
      fixedAmount: invoices.fixedAmount,
      totalAmount: invoices.totalAmount,
      isRecurring: invoices.isRecurring,
      recurringInterval: invoices.recurringInterval,
      notes: invoices.notes,
      reminderCount: invoices.reminderCount,
      lastReminderDate: invoices.lastReminderDate,
      serviceDate: invoices.serviceDate,
      servicePeriodStart: invoices.servicePeriodStart,
      servicePeriodEnd: invoices.servicePeriodEnd,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
      clientName: clients.name,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
    .limit(1);

  if (!row) {
    throw new NotFoundError('Invoice not found');
  }

  const today = new Date().toISOString().split('T')[0];
  const isOverdue =
    row.status === 'open' && row.paymentDueDate && row.paymentDueDate < today;

  return {
    ...row,
    hours: row.hours ? parseFloat(row.hours as string) : null,
    hourlyRate: row.hourlyRate ? parseFloat(row.hourlyRate as string) : null,
    fixedAmount: row.fixedAmount ? parseFloat(row.fixedAmount as string) : null,
    totalAmount: row.totalAmount ? parseFloat(row.totalAmount as string) : null,
    overdue: isOverdue,
  };
}

export async function createInvoice(
  userId: string,
  data: {
    clientId: string;
    projectId?: string;
    invoiceDate?: string;
    paymentDays?: number;
    description: string;
    projectSubtitle?: string;
    billingType: 'hourly' | 'fixed';
    hours?: number;
    hourlyRate?: number;
    fixedAmount?: number;
    isRecurring?: boolean;
    recurringInterval?: 'monthly' | 'quarterly' | 'yearly';
    notes?: string;
    serviceDate?: string;
    servicePeriodStart?: string;
    servicePeriodEnd?: string;
  },
) {
  // Validate client address (§14 UStG)
  const [clientData] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, data.clientId))
    .limit(1);

  if (!clientData) {
    throw new NotFoundError('Client not found');
  }

  if (!clientData.addressStreet || !clientData.addressZip || !clientData.addressCity) {
    throw new ValidationError('Client address incomplete. Full address is required for invoices (§14 UStG).');
  }

  const invoiceNumber = await generateInvoiceNumber();
  const invoiceDate = data.invoiceDate || new Date().toISOString().split('T')[0];
  const paymentDays = data.paymentDays ?? 14;
  const paymentDueDate = addDays(invoiceDate, paymentDays);
  const totalAmount = calculateTotal(data);

  const [created] = await db
    .insert(invoices)
    .values({
      userId,
      clientId: data.clientId,
      projectId: data.projectId || null,
      invoiceNumber,
      invoiceDate,
      paymentDueDate,
      paymentDays,
      status: 'open',
      description: data.description,
      projectSubtitle: data.projectSubtitle || null,
      billingType: data.billingType,
      hours: data.hours ?? null,
      hourlyRate: data.hourlyRate ?? null,
      fixedAmount: data.fixedAmount ?? null,
      totalAmount: totalAmount.toString(),
      isRecurring: data.isRecurring ?? false,
      recurringInterval: data.recurringInterval || null,
      recurringNextDate: data.isRecurring && data.recurringInterval
        ? calculateRecurringNextDate(invoiceDate, data.recurringInterval)
        : null,
      notes: data.notes || null,
      serviceDate: data.serviceDate || null,
      servicePeriodStart: data.servicePeriodStart || null,
      servicePeriodEnd: data.servicePeriodEnd || null,
    })
    .returning();

  // Auto-archive: generate PDF and save to documents
  try {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, data.clientId))
      .limit(1);

    const [userSettings] = await db
      .select()
      .from(settings)
      .where(eq(settings.userId, userId))
      .limit(1);

    const pdfBytes = await generateInvoicePdf(created, client, userSettings || {});
    await autoArchiveInvoice(userId, created.id, pdfBytes, invoiceNumber);
  } catch (err) {
    // Don't fail invoice creation if archiving fails
    console.error('Auto-archive failed:', err);
  }

  return {
    ...created,
    hours: created.hours ? parseFloat(created.hours as string) : null,
    hourlyRate: created.hourlyRate ? parseFloat(created.hourlyRate as string) : null,
    fixedAmount: created.fixedAmount ? parseFloat(created.fixedAmount as string) : null,
    totalAmount: created.totalAmount ? parseFloat(created.totalAmount as string) : null,
  };
}

export async function updateInvoice(
  userId: string,
  invoiceId: string,
  data: Partial<{
    clientId: string;
    projectId: string;
    invoiceDate: string;
    paymentDays: number;
    description: string;
    projectSubtitle: string;
    billingType: 'hourly' | 'fixed';
    hours: number;
    hourlyRate: number;
    fixedAmount: number;
    isRecurring: boolean;
    recurringInterval: 'monthly' | 'quarterly' | 'yearly';
    notes: string;
    serviceDate: string;
    servicePeriodStart: string;
    servicePeriodEnd: string;
  }>,
) {
  // Get existing invoice first
  const [existing] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Invoice not found');
  }

  const updateData: Record<string, unknown> = { ...data };

  // Recalculate total if billing fields change
  const billingType = data.billingType || existing.billingType;
  const hours = data.hours ?? (existing.hours ? parseFloat(existing.hours as string) : null);
  const hourlyRate = data.hourlyRate ?? (existing.hourlyRate ? parseFloat(existing.hourlyRate as string) : null);
  const fixedAmount = data.fixedAmount ?? (existing.fixedAmount ? parseFloat(existing.fixedAmount as string) : null);

  if (
    data.billingType !== undefined ||
    data.hours !== undefined ||
    data.hourlyRate !== undefined ||
    data.fixedAmount !== undefined
  ) {
    const total = calculateTotal({ billingType, hours, hourlyRate, fixedAmount });
    updateData.totalAmount = total.toString();
  }

  // Recalculate paymentDueDate if invoiceDate or paymentDays change
  if (data.invoiceDate !== undefined || data.paymentDays !== undefined) {
    const invoiceDate = data.invoiceDate || existing.invoiceDate;
    const paymentDays = data.paymentDays ?? existing.paymentDays;
    updateData.paymentDueDate = addDays(invoiceDate, paymentDays);
  }

  const [updated] = await db
    .update(invoices)
    .set(updateData)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
    .returning();

  return {
    ...updated,
    hours: updated.hours ? parseFloat(updated.hours as string) : null,
    hourlyRate: updated.hourlyRate ? parseFloat(updated.hourlyRate as string) : null,
    fixedAmount: updated.fixedAmount ? parseFloat(updated.fixedAmount as string) : null,
    totalAmount: updated.totalAmount ? parseFloat(updated.totalAmount as string) : null,
  };
}

export async function cancelInvoice(userId: string, invoiceId: string) {
  const [existing] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Invoice not found');
  }

  if (existing.status === 'paid') {
    throw new ValidationError('Paid invoices cannot be cancelled');
  }

  const [updated] = await db
    .update(invoices)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
    .returning();

  return {
    ...updated,
    hours: updated.hours ? parseFloat(updated.hours as string) : null,
    hourlyRate: updated.hourlyRate ? parseFloat(updated.hourlyRate as string) : null,
    fixedAmount: updated.fixedAmount ? parseFloat(updated.fixedAmount as string) : null,
    totalAmount: updated.totalAmount ? parseFloat(updated.totalAmount as string) : null,
  };
}

export async function updateInvoiceStatus(
  userId: string,
  invoiceId: string,
  data: { status: string; paidDate?: string },
) {
  const [existing] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Invoice not found');
  }

  const updateData: Record<string, unknown> = {
    status: data.status,
  };

  if (data.status === 'paid') {
    updateData.paidDate = data.paidDate || new Date().toISOString().split('T')[0];
  }

  const [updated] = await db
    .update(invoices)
    .set(updateData)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
    .returning();

  return {
    ...updated,
    hours: updated.hours ? parseFloat(updated.hours as string) : null,
    hourlyRate: updated.hourlyRate ? parseFloat(updated.hourlyRate as string) : null,
    fixedAmount: updated.fixedAmount ? parseFloat(updated.fixedAmount as string) : null,
    totalAmount: updated.totalAmount ? parseFloat(updated.totalAmount as string) : null,
  };
}
