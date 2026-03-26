import { pgTable, uuid, varchar, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { expenses } from './expenses.js';

export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 7 }).notNull().default('#6366f1'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const expenseTags = pgTable('expense_tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  expenseId: uuid('expense_id').references(() => expenses.id, { onDelete: 'cascade' }).notNull(),
  tagId: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
}, (table) => [
  unique('expense_tag_unique').on(table.expenseId, table.tagId),
]);
