export type InvoiceStatus = 'open' | 'paid' | 'overdue';
export type BillingType = 'hourly' | 'fixed';
export type RecurringInterval = 'monthly' | 'quarterly' | 'yearly';

export interface Invoice {
  id: string;
  userId: string;
  clientId: string;
  projectId: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  paymentDueDate: string;
  paymentDays: number;
  description: string;
  projectSubtitle: string | null;
  billingType: BillingType;
  hours: number | null;
  hourlyRate: number | null;
  fixedAmount: number | null;
  totalAmount: number;
  status: InvoiceStatus;
  paidDate: string | null;
  isRecurring: boolean;
  recurringInterval: RecurringInterval | null;
  recurringNextDate: string | null;
  notes: string | null;
  reminderCount: number;
  lastReminderDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceCreate {
  clientId: string;
  projectId?: string;
  invoiceDate?: string;
  paymentDays?: number;
  description: string;
  projectSubtitle?: string;
  billingType: BillingType;
  hours?: number;
  hourlyRate?: number;
  fixedAmount?: number;
  isRecurring?: boolean;
  recurringInterval?: RecurringInterval;
  notes?: string;
}

export type InvoiceUpdate = Partial<InvoiceCreate>;

export interface InvoiceStatusChange {
  status: 'paid';
  paidDate: string;
}
