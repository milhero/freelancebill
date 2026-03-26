import { fetchApi } from './client.js';
import type { ApiResponse, Expense, ExpenseCreate, ExpenseUpdate } from '@freelancebill/shared';

export async function getExpenses(tagId?: string, from?: string, to?: string) {
  return fetchApi<{ data: Expense[] }>('/api/expenses', {
    params: { tag_id: tagId, from, to },
  });
}

export async function getExpense(id: string) {
  return fetchApi<ApiResponse<Expense>>(`/api/expenses/${id}`);
}

export async function createExpense(data: ExpenseCreate) {
  return fetchApi<ApiResponse<Expense>>('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateExpense(id: string, data: ExpenseUpdate) {
  return fetchApi<ApiResponse<Expense>>(`/api/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteExpense(id: string) {
  return fetchApi(`/api/expenses/${id}`, { method: 'DELETE' });
}

export async function uploadReceipt(expenseId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`/api/expenses/${expenseId}/receipt`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(body.error || `HTTP ${response.status}`);
  }

  return response.json() as Promise<{ data: { receiptPath: string } }>;
}

export async function deleteReceipt(expenseId: string) {
  return fetchApi<{ data: { success: boolean } }>(`/api/expenses/${expenseId}/receipt`, {
    method: 'DELETE',
  });
}
