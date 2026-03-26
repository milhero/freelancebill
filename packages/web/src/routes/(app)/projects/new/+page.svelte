<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { createProject } from '$lib/api/projects.js';
  import { getClients } from '$lib/api/clients.js';
  import type { Client } from '@freelancebill/shared';
  import { t } from '$lib/i18n/index.svelte.js';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { showToast } from '$lib/stores/toast.svelte.js';

  let clients = $state<Client[]>([]);
  let name = $state('');
  let clientId = $state('');
  let status = $state<'active' | 'completed'>('active');
  let startDate = $state('');
  let endDate = $state('');
  let notes = $state('');
  let saving = $state(false);

  onMount(async () => {
    const res = await getClients();
    clients = res.data;
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    saving = true;
    try {
      await createProject({
        name,
        clientId: clientId || undefined,
        status,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        notes: notes || undefined,
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

<PageHeader title={t('projects.new')} />

<form onsubmit={handleSubmit} class="max-w-2xl">
  <Card>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="sm:col-span-2">
        <Input label={t('projects.name')} bind:value={name} required />
      </div>
      <Select label={t('projects.client')} bind:value={clientId}>
        <option value="">-- {t('projects.client')} --</option>
        {#each clients as c}
          <option value={c.id}>{c.name}</option>
        {/each}
      </Select>
      <Select label={t('projects.status')} bind:value={status}>
        <option value="active">{t('projects.active')}</option>
        <option value="completed">{t('projects.completed')}</option>
      </Select>
      <Input label={t('projects.startDate')} type="date" bind:value={startDate} />
      <Input label={t('projects.endDate')} type="date" bind:value={endDate} />
      <div class="sm:col-span-2">
        <Textarea label={t('projects.notes')} bind:value={notes} />
      </div>
    </div>
  </Card>

  <div class="flex justify-end gap-3 mt-6">
    <Button variant="ghost" href="/projects">{t('common.cancel')}</Button>
    <Button type="submit" loading={saving}>{t('projects.create')}</Button>
  </div>
</form>
