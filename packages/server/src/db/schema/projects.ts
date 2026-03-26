import { pgTable, uuid, varchar, text, date, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { clients } from './clients.js';

export const projectStatusEnum = pgEnum('project_status', ['active', 'completed']);

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  status: projectStatusEnum('status').notNull().default('active'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
