import { fetchApi } from './client.js';
import type { ApiResponse, User } from '@freelancebill/shared';

export async function login(email: string, password: string) {
  return fetchApi<ApiResponse<User>>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  return fetchApi('/api/auth/logout', { method: 'POST' });
}

export async function getMe() {
  return fetchApi<ApiResponse<User>>('/api/auth/me');
}
