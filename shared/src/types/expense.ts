export interface Tag {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface TagCreate {
  name: string;
  color?: string;
}

export interface Expense {
  id: string;
  userId: string;
  date: string;
  description: string;
  amount: number;
  paymentMethod: string | null;
  receiptPath: string | null;
  notes: string | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCreate {
  date: string;
  description: string;
  amount: number;
  paymentMethod?: string | null;
  notes?: string | null;
  tagIds?: string[];
}

export type ExpenseUpdate = Partial<ExpenseCreate>;
