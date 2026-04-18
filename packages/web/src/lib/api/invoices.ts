import { fetchApi } from './client.js';
import type { ApiResponse, ApiListResponse, Invoice, InvoiceCreate, InvoiceUpdate, InvoiceStatusChange } from '@freelancebill/shared';

export async function getInvoices(status?: string, clientId?: string, year?: string) {
  return fetchApi<{ data: Invoice[] }>('/api/invoices', {
    params: { status, client_id: clientId, year },
  });
}

export async function getInvoice(id: string) {
  return fetchApi<ApiResponse<Invoice>>(`/api/invoices/${id}`);
}

export async function createInvoice(data: InvoiceCreate) {
  return fetchApi<ApiResponse<Invoice>>('/api/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateInvoice(id: string, data: InvoiceUpdate) {
  return fetchApi<ApiResponse<Invoice>>(`/api/invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteInvoice(id: string) {
  return fetchApi(`/api/invoices/${id}`, { method: 'DELETE' });
}

export async function cancelInvoice(id: string) {
  return fetchApi<ApiResponse<Invoice>>(`/api/invoices/${id}/cancel`, {
    method: 'POST',
  });
}

export async function updateInvoiceStatus(id: string, data: InvoiceStatusChange) {
  return fetchApi<ApiResponse<Invoice>>(`/api/invoices/${id}/status`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getInvoicePdfUrl(id: string, download = false) {
  return `/api/invoices/${id}/pdf${download ? '?download=true' : ''}`;
}

export async function createReminder(id: string): Promise<Blob> {
  const response = await fetch(`/api/invoices/${id}/reminder`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(body.error || `HTTP ${response.status}`);
    }
    throw new Error(`HTTP ${response.status}`);
  }
  return response.blob();
}
