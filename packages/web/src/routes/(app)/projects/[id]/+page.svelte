<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getProject, updateProject, getProjectStats } from '$lib/api/projects.js';
  import { getClients } from '$lib/api/clients.js';
  import type { Project, Client, ProjectStatsData } from '@freelancebill/shared';
  import { formatCurrency, formatDate } from '@freelancebill/shared';
  import { t } from '$lib/i18n/index.svelte.js';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { showToast } from '$lib/stores/toast.svelte.js';

  let project = $state<Project | null>(null);
  let stats = $state<ProjectStatsData | null>(null);
  let clients = $state<Client[]>([]);
  let saving = $state(false);
  let loading = $state(true);
  let activeTab = $state<'overview' | 'invoices' | 'details'>('overview');

  let clientName = $derived(
    project?.clientId
      ? clients.find((c) => c.id === project!.clientId)?.name ?? null
      : stats?.clientName ?? null
  );

  onMount(async () => {
    const id = $page.params.id;
    try {
      const [projectRes, statsRes, clientsRes] = await Promise.all([
        getProject(id),
        getProjectStats(id),
        getClients(),
      ]);
      project = projectRes.data;
      stats = statsRes.data;
      clients = clientsRes.data;
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      loading = false;
    }
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

  const statusVariant: Record<string, 'green' | 'yellow' | 'gray'> = {
    active: 'green',
    completed: 'gray',
  };
</script>

{#if loading}
  <div class="flex items-center justify-center py-20">
    <div class="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-600"></div>
  </div>
{:else if project && stats}
  <!-- Header -->
  <PageHeader title={project.name}>
    {#snippet actions()}
      <div class="flex items-center gap-3">
        {#if clientName}
          <span class="text-sm text-gray-500">{clientName}</span>
        {/if}
        <Badge variant={statusVariant[project.status] ?? 'gray'}>
          {project.status === 'active' ? t('projects.active') : t('projects.completed')}
        </Badge>
        <Button variant="ghost" href="/projects">{t('common.back')}</Button>
      </div>
    {/snippet}
  </PageHeader>

  <!-- KPI Cards -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <Card>
      <p class="text-sm text-gray-500">{t('dashboard.revenue')}</p>
      <p class="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
    </Card>
    <Card>
      <p class="text-sm text-gray-500">{t('dashboard.expenses')}</p>
      <p class="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalExpenses)}</p>
    </Card>
    <Card>
      <p class="text-sm text-gray-500">{t('dashboard.profit')}</p>
      <p class="mt-1 text-2xl font-semibold {stats.profitLoss >= 0 ? 'text-success-600' : 'text-danger-600'}">{formatCurrency(stats.profitLoss)}</p>
    </Card>
    <Card>
      <p class="text-sm text-gray-500">{t('invoices.title')}</p>
      <p class="mt-1 text-2xl font-semibold text-gray-900">{stats.invoiceCount}</p>
    </Card>
  </div>

  <!-- Tabs -->
  <div class="mb-6 flex gap-2">
    <button
      type="button"
      class="px-3 py-1.5 text-sm rounded-lg font-medium transition-colors {activeTab === 'overview' ? 'bg-accent-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
      onclick={() => (activeTab = 'overview')}
    >
      {t('dashboard.title')}
    </button>
    <button
      type="button"
      class="px-3 py-1.5 text-sm rounded-lg font-medium transition-colors {activeTab === 'invoices' ? 'bg-accent-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
      onclick={() => (activeTab = 'invoices')}
    >
      {t('invoices.title')}
    </button>
    <button
      type="button"
      class="px-3 py-1.5 text-sm rounded-lg font-medium transition-colors {activeTab === 'details' ? 'bg-accent-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
      onclick={() => (activeTab = 'details')}
    >
      Details
    </button>
  </div>

  <!-- Tab Content -->
  {#if activeTab === 'overview'}
    <Card>
      <h2 class="text-base font-semibold text-gray-900 mb-3">{t('dashboard.title')}</h2>
      <div class="text-sm text-gray-600 space-y-2">
        <p>
          {project.name}
          {#if clientName}
            &mdash; {clientName}
          {/if}
        </p>
        {#if project.startDate}
          <p>{t('projects.startDate')}: {formatDate(project.startDate)}</p>
        {/if}
        {#if project.endDate}
          <p>{t('projects.endDate')}: {formatDate(project.endDate)}</p>
        {/if}
        {#if project.notes}
          <p class="text-gray-500 mt-2">{project.notes}</p>
        {/if}
      </div>
    </Card>

  {:else if activeTab === 'invoices'}
    {#if stats.invoices.length === 0}
      <Card>
        <p class="text-sm text-gray-400 text-center py-8">{t('common.noData')}</p>
      </Card>
    {:else}
      <Card>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100">
                <th class="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('invoices.date')}</th>
                <th class="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('invoices.number')}</th>
                <th class="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('invoices.description')}</th>
                <th class="text-right py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('invoices.amount')}</th>
                <th class="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('invoices.status')}</th>
              </tr>
            </thead>
            <tbody>
              {#each stats.invoices as invoice (invoice.id)}
                <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td class="py-3 px-3 text-gray-500">{formatDate(invoice.invoiceDate)}</td>
                  <td class="py-3 px-3">
                    <a href="/invoices/{invoice.id}" class="font-medium text-gray-900 hover:text-accent-600 transition-colors">
                      {invoice.invoiceNumber}
                    </a>
                  </td>
                  <td class="py-3 px-3 text-gray-700">{invoice.description ?? ''}</td>
                  <td class="py-3 px-3 text-right font-medium text-gray-900">{formatCurrency(invoice.totalAmount)}</td>
                  <td class="py-3 px-3">
                    {#if invoice.status === 'paid'}
                      <Badge variant="green">{t('invoices.paid')}</Badge>
                    {:else if invoice.status === 'cancelled'}
                      <Badge variant="gray"><span class="line-through">{t('invoices.cancelled')}</span></Badge>
                    {:else}
                      <Badge variant="yellow">{t('invoices.open')}</Badge>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </Card>
    {/if}

  {:else if activeTab === 'details'}
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
{/if}
