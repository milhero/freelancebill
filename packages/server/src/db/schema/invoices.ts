import { pgTable, uuid, varchar, text, date, numeric, integer, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { clients } from './clients.js';
import { projects } from './projects.js';

export const invoiceStatusEnum = pgEnum('invoice_status', ['open', 'paid', 'overdue', 'cancelled']);
export const billingTypeEnum = pgEnum('billing_type', ['hourly', 'fixed']);
export const recurringIntervalEnum = pgEnum('recurring_interval', ['monthly', 'quarterly', 'yearly']);

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'restrict' }).notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  invoiceNumber: varchar('invoice_number', { length: 20 }).notNull().unique(),
  invoiceDate: date('invoice_date').notNull(),
  paymentDueDate: date('payment_due_date').notNull(),
  paymentDays: integer('payment_days').notNull().default(30),
  description: text('description').notNull(),
  projectSubtitle: text('project_subtitle'),
  billingType: billingTypeEnum('billing_type').notNull(),
  hours: numeric('hours', { precision: 10, scale: 2 }),
  hourlyRate: numeric('hourly_rate', { precision: 10, scale: 2 }),
  fixedAmount: numeric('fixed_amount', { precision: 10, scale: 2 }),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: invoiceStatusEnum('status').notNull().default('open'),
  paidDate: date('paid_date'),
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurringInterval: recurringIntervalEnum('recurring_interval'),
  recurringNextDate: date('recurring_next_date'),
  notes: text('notes'),
  reminderCount: integer('reminder_count').default(0),
  lastReminderDate: varchar('last_reminder_date', { length: 10 }),
  serviceDate: varchar('service_date', { length: 10 }),
  servicePeriodStart: varchar('service_period_start', { length: 10 }),
  servicePeriodEnd: varchar('service_period_end', { length: 10 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
