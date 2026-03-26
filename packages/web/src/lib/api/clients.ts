import { fetchApi } from './client.js';
import type { ApiResponse, ApiListResponse, Client, ClientCreate, ClientUpdate } from '@freelancebill/shared';

export async function getClients(search?: string) {
  return fetchApi<ApiListResponse<Client>>('/api/clients', { params: { search } });
}

export async function getClient(id: string) {
  return fetchApi<ApiResponse<Client>>(`/api/clients/${id}`);
}

export async function createClient(data: ClientCreate) {
  return fetchApi<ApiResponse<Client>>('/api/clients', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateClient(id: string, data: ClientUpdate) {
  return fetchApi<ApiResponse<Client>>(`/api/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteClient(id: string) {
  return fetchApi(`/api/clients/${id}`, { method: 'DELETE' });
}
