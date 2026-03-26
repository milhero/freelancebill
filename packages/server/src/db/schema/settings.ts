import { pgTable, uuid, varchar, numeric, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const settings = pgTable('settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  addressStreet: varchar('address_street', { length: 255 }).notNull(),
  addressZip: varchar('address_zip', { length: 20 }).notNull(),
  addressCity: varchar('address_city', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  iban: varchar('iban', { length: 50 }),
  bic: varchar('bic', { length: 20 }),
  bankName: varchar('bank_name', { length: 255 }),
  taxFreeAllowance: numeric('tax_free_allowance', { precision: 10, scale: 2 }).notNull().default('11784.00'),
  defaultPaymentDays: integer('default_payment_days').notNull().default(30),
  defaultHourlyRate: numeric('default_hourly_rate', { precision: 10, scale: 2 }).notNull().default('26.00'),
  language: varchar('language', { length: 5 }).notNull().default('de'),
  taxMode: varchar('tax_mode', { length: 20 }).notNull().default('kleinunternehmer'),
  taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('19.00'),
  taxId: varchar('tax_id', { length: 50 }),
  vatId: varchar('vat_id', { length: 50 }),
  invoiceTemplate: varchar('invoice_template', { length: 30 }).notNull().default('standard'),
  invoiceAccentColor: varchar('invoice_accent_color', { length: 7 }).notNull().default('#1a1a2e'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
