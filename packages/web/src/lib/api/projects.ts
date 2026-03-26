import { fetchApi } from './client.js';
import type { ApiResponse, ApiListResponse, Project, ProjectCreate, ProjectUpdate } from '@freelancebill/shared';

export async function getProjects(clientId?: string, status?: string) {
  return fetchApi<ApiListResponse<Project>>('/api/projects', {
    params: { client_id: clientId, status },
  });
}

export async function getProject(id: string) {
  return fetchApi<ApiResponse<Project>>(`/api/projects/${id}`);
}

export async function createProject(data: ProjectCreate) {
  return fetchApi<ApiResponse<Project>>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProject(id: string, data: ProjectUpdate) {
  return fetchApi<ApiResponse<Project>>(`/api/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string) {
  return fetchApi(`/api/projects/${id}`, { method: 'DELETE' });
}
