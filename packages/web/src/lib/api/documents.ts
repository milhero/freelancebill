import { fetchApi } from './client.js';

export interface Document {
  id: string;
  userId: string;
  invoiceId: string | null;
  name: string;
  type: string;
  filePath: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedAt: string;
}

export async function getDocuments(type?: string, year?: string) {
  return fetchApi<{ data: Document[] }>('/api/documents', {
    params: { type, year },
  });
}

export async function uploadDocument(file: File, name: string, type: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);
  formData.append('type', type);

  const response = await fetch('/api/documents', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(body.error || `HTTP ${response.status}`);
  }

  return response.json() as Promise<{ data: Document }>;
}

export function getDocumentFileUrl(id: string) {
  return `/api/documents/${id}/file`;
}

export async function deleteDocument(id: string) {
  return fetchApi<{ data: { success: boolean } }>(`/api/documents/${id}`, {
    method: 'DELETE',
  });
}
