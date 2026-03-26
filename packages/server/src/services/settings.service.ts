import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { settings } from '../db/schema/settings.js';
import { NotFoundError } from '../utils/errors.js';

export async function getSettings(userId: string) {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId))
    .limit(1);

  if (!row) {
    throw new NotFoundError('Settings');
  }

  return {
    ...row,
    taxFreeAllowance: parseFloat(row.taxFreeAllowance),
    defaultHourlyRate: parseFloat(row.defaultHourlyRate),
    taxRate: parseFloat(row.taxRate),
  };
}

export async function updateSettings(
  userId: string,
  data: Partial<{
    fullName: string;
    addressStreet: string;
    addressZip: string;
    addressCity: string;
    email: string;
    phone: string | null;
    iban: string | null;
    bic: string | null;
    bankName: string | null;
    taxFreeAllowance: string;
    defaultPaymentDays: number;
    defaultHourlyRate: string;
    language: string;
    taxMode: string;
    taxRate: string;
    taxId: string | null;
    vatId: string | null;
  }>,
) {
  const [updated] = await db
    .update(settings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(settings.userId, userId))
    .returning();

  if (!updated) {
    throw new NotFoundError('Settings');
  }

  return {
    ...updated,
    taxFreeAllowance: parseFloat(updated.taxFreeAllowance),
    defaultHourlyRate: parseFloat(updated.defaultHourlyRate),
    taxRate: parseFloat(updated.taxRate),
  };
}
