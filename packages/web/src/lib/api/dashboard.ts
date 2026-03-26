import { fetchApi } from './client.js';
import type { ApiResponse, DashboardData } from '@freelancebill/shared';

export async function getDashboard() {
  return fetchApi<ApiResponse<DashboardData>>('/api/dashboard');
}
