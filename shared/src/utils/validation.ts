import { z } from 'zod';

export const emailSchema = z.string().email();

export const moneySchema = z.number().min(0).multipleOf(0.01);

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format');

export const uuidSchema = z.string().uuid();
