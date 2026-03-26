import { fetchApi } from './client.js';
import type { ApiResponse, Settings, SettingsUpdate } from '@freelancebill/shared';

export async function getSettings() {
  return fetchApi<ApiResponse<Settings>>('/api/settings');
}

export async function updateSettings(data: SettingsUpdate) {
  return fetchApi<ApiResponse<Settings>>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
