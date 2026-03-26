export const INVOICE_STATUS = {
  OPEN: 'open',
  PAID: 'paid',
  OVERDUE: 'overdue',
} as const;

export const BILLING_TYPE = {
  HOURLY: 'hourly',
  FIXED: 'fixed',
} as const;

export const RECURRING_INTERVAL = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
} as const;
