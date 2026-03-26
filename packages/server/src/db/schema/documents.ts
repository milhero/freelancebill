import { pgTable, uuid, varchar, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { invoices } from './invoices.js';

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull().default('other'), // 'invoice_sent' | 'invoice_received' | 'other'
  filePath: varchar('file_path', { length: 500 }).notNull(),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
});
