<script lang="ts">
  import { onMount } from 'svelte';
  import { getProjects, deleteProject } from '$lib/api/projects.js';
  import type { Project } from '@freelancebill/shared';
  import { t } from '$lib/i18n/index.svelte.js';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
  import { showToast } from '$lib/stores/toast.svelte.js';

  let projects = $state<Project[]>([]);
  let deleteTarget = $state<Project | null>(null);

  onMount(loadProjects);

  async function loadProjects() {
    const res = await getProjects();
    projects = res.data;
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteProject(deleteTarget.id);
      showToast(t('projects.delete'), 'success');
      deleteTarget = null;
      await loadProjects();
    } catch {
      showToast(t('common.error'), 'error');
    }
  }
</script>

<PageHeader title={t('projects.title')}>
  {#snippet actions()}
    <Button href="/projects/new">{t('projects.new')}</Button>
  {/snippet}
</PageHeader>

{#if projects.length === 0}
  <EmptyState title={t('common.noData')} description={t('projects.new')}>
    {#snippet actions()}
      <Button href="/projects/new">{t('projects.new')}</Button>
    {/snippet}
  </EmptyState>
{:else}
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each projects as project (project.id)}
      <Card>
        <div class="flex items-start justify-between">
          <div>
            <a href="/projects/{project.id}" class="text-base font-medium text-gray-900 hover:text-accent-600 transition-colors">
              {project.name}
            </a>
            <div class="mt-2">
              <Badge variant={project.status === 'active' ? 'green' : 'gray'}>
                {project.status === 'active' ? t('projects.active') : t('projects.completed')}
              </Badge>
            </div>
          </div>
          <button
            type="button"
            class="text-gray-300 hover:text-danger-500 transition-colors"
            onclick={() => (deleteTarget = project)}
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </Card>
    {/each}
  </div>
{/if}

<ConfirmDialog
  open={deleteTarget !== null}
  title={t('projects.delete')}
  message={t('projects.confirmDelete')}
  onconfirm={handleDelete}
  oncancel={() => (deleteTarget = null)}
/>
