import { db } from '../db/index.js';
import { invoices } from '../db/schema/invoices.js';
import { like, desc } from 'drizzle-orm';

export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear().toString();

  // Get the max invoice number for this year
  const [latest] = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(like(invoices.invoiceNumber, `${year}-%`))
    .orderBy(desc(invoices.invoiceNumber))
    .limit(1);

  let nextNum = 1;
  if (latest) {
    const parts = latest.invoiceNumber.split('-');
    nextNum = parseInt(parts[1], 10) + 1;
  }

  return `${year}-${nextNum.toString().padStart(3, '0')}`;
}
