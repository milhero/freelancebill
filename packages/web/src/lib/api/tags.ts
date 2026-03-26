import { fetchApi } from './client.js';
import type { Tag, TagCreate } from '@freelancebill/shared';

export async function getTags() {
  return fetchApi<{ data: Tag[] }>('/api/tags');
}

export async function createTag(data: TagCreate) {
  return fetchApi<{ data: Tag }>('/api/tags', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
