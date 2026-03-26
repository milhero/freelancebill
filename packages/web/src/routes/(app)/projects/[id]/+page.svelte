<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getProject, updateProject } from '$lib/api/projects.js';
  import { getClients } from '$lib/api/clients.js';
  import type { Project, Client } from '@freelancebill/shared';
  import { t } from '$lib/i18n/index.svelte.js';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { showToast } from '$lib/stores/toast.svelte.js';

  let project = $state<Project | null>(null);
  let clients = $state<Client[]>([]);
  let saving = $state(false);

  onMount(async () => {
    const [projectRes, clientsRes] = await Promise.all([
      getProject($page.params.id),
      getClients(),
    ]);
    project = projectRes.data;
    clients = clientsRes.data;
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!project) return;
    saving = true;
    try {
      await updateProject(project.id, {
        name: project.name,
        clientId: project.clientId || undefined,
        status: project.status,
        startDate: project.startDate || undefined,
        endDate: project.endDate || undefined,
        notes: project.notes || undefined,
      });
      showToast(t('common.success'), 'success');
      goto('/projects');
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      saving = false;
    }
  }
</script>

{#if project}
  <PageHeader title={project.name} />

  <form onsubmit={handleSubmit} class="max-w-2xl">
    <Card>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2">
          <Input label={t('projects.name')} bind:value={project.name} required />
        </div>
        <Select label={t('projects.client')} bind:value={project.clientId}>
          <option value="">-- {t('projects.client')} --</option>
          {#each clients as c}
            <option value={c.id}>{c.name}</option>
          {/each}
        </Select>
        <Select label={t('projects.status')} bind:value={project.status}>
          <option value="active">{t('projects.active')}</option>
          <option value="completed">{t('projects.completed')}</option>
        </Select>
        <Input label={t('projects.startDate')} type="date" bind:value={project.startDate} />
        <Input label={t('projects.endDate')} type="date" bind:value={project.endDate} />
        <div class="sm:col-span-2">
          <Textarea label={t('projects.notes')} bind:value={project.notes} />
        </div>
      </div>
    </Card>

    <div class="flex justify-end gap-3 mt-6">
      <Button variant="ghost" href="/projects">{t('common.cancel')}</Button>
      <Button type="submit" loading={saving}>{t('projects.save')}</Button>
    </div>
  </form>
{/if}
