<script lang="ts">
  import { onMount } from 'svelte';
  import { getClients, deleteClient } from '$lib/api/clients.js';
  import type { Client } from '@freelancebill/shared';
  import { t } from '$lib/i18n/index.svelte.js';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
  import { showToast } from '$lib/stores/toast.svelte.js';

  let clients = $state<Client[]>([]);
  let search = $state('');
  let deleteTarget = $state<Client | null>(null);
  let loading = $state(true);
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  onMount(loadClients);

  async function loadClients() {
    loading = true;
    try {
      const res = await getClients(search || undefined);
      clients = res.data;
    } finally {
      loading = false;
    }
  }

  function debouncedSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadClients, 300);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteClient(deleteTarget.id);
      showToast(t('clients.delete'), 'success');
      deleteTarget = null;
      await loadClients();
    } catch {
      showToast(t('common.error'), 'error');
    }
  }
</script>

<PageHeader title={t('clients.title')}>
  {#snippet actions()}
    <Button href="/clients/new">{t('clients.new')}</Button>
  {/snippet}
</PageHeader>

<div class="mb-6 max-w-sm">
  <Input placeholder={t('common.search')} bind:value={search} oninput={debouncedSearch} />
</div>

{#if clients.length === 0}
  <EmptyState title={t('common.noData')} description={t('clients.new')}>
    {#snippet actions()}
      <Button href="/clients/new">{t('clients.new')}</Button>
    {/snippet}
  </EmptyState>
{:else}
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each clients as client (client.id)}
      <a href="/clients/{client.id}" class="block hover:shadow-md transition-shadow rounded-xl">
        <Card>
          <div class="flex items-start justify-between">
            <div>
              <span class="text-base font-medium text-gray-900">
                {client.name}
              </span>
              {#if client.addressCity}
                <p class="mt-1 text-sm text-gray-500">{client.addressZip} {client.addressCity}</p>
              {/if}
              {#if client.email}
                <p class="mt-0.5 text-sm text-gray-400">{client.email}</p>
              {/if}
            </div>
            <button
              type="button"
              class="text-gray-300 hover:text-danger-500 transition-colors"
              onclick={(e) => { e.preventDefault(); e.stopPropagation(); deleteTarget = client; }}
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </Card>
      </a>
    {/each}
  </div>
{/if}

<ConfirmDialog
  open={deleteTarget !== null}
  title={t('clients.delete')}
  message={t('clients.confirmDelete')}
  onconfirm={handleDelete}
  oncancel={() => (deleteTarget = null)}
/>
