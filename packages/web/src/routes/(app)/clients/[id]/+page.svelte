<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getClient, updateClient, getClientStats } from '$lib/api/clients.js';
  import type { Client, ClientStatsData } from '@freelancebill/shared';
  import { formatCurrency, formatDate } from '@freelancebill/shared';
  import { t } from '$lib/i18n/index.svelte.js';
  import { showToast } from '$lib/stores/toast.svelte.js';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';

  let client = $state<Client | null>(null);
  let stats = $state<ClientStatsData | null>(null);
  let activeTab = $state<'overview' | 'invoices' | 'projects' | 'details'>('overview');
  let saving = $state(false);

  let maxRevenue = $derived(
    stats?.monthlyRevenue?.length
      ? Math.max(...stats.monthlyRevenue.map((m) => m.revenue), 1)
      : 1
  );

  const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  onMount(async () => {
    const id = $page.params.id;
    const [clientRes, statsRes] = await Promise.all([
      getClient(id),
      getClientStats(id),
    ]);
    client = clientRes.data;
    stats = statsRes.data;
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!client) return;
    saving = true;
    try {
      await updateClient(client.id, {
        name: client.name,
        addressStreet: client.addressStreet || undefined,
        addressZip: client.addressZip || undefined,
        addressCity: client.addressCity || undefined,
        contactPerson: client.contactPerson || undefined,
        email: client.email || undefined,
        phone: client.phone || undefined,
        notes: client.notes || undefined,
      });
      showToast(t('common.success'), 'success');
      goto('/clients');
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      saving = false;
    }
  }

  function statusVariant(status: string): 'green' | 'yellow' | 'red' | 'gray' {
    switch (status) {
      case 'paid': return 'green';
      case 'open': return 'yellow';
      case 'overdue': return 'red';
      case 'cancelled': return 'gray';
      default: return 'gray';
    }
  }

  function statusLabel(status: string): string {
    switch (status) {
      case 'paid': return t('invoices.paid');
      case 'open': return t('invoices.open');
      case 'overdue': return t('invoices.overdue');
      case 'cancelled': return t('invoices.cancelled');
      default: return status;
    }
  }
</script>

{#if !client || !stats}
  <p class="text-gray-500">{t('common.loading')}</p>
{:else}
  <PageHeader title={client.name}>
    {#snippet actions()}
      <Button variant="ghost" href="/clients">{t('common.back')}</Button>
    {/snippet}
  </PageHeader>

  <!-- KPI Cards -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <Card>
      <div class="text-center">
        <div class="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalRevenue)}</div>
        <div class="text-xs text-gray-500 mt-1">Gesamtumsatz</div>
      </div>
    </Card>
    <Card>
      <div class="text-center">
        <div class="text-2xl font-semibold text-gray-900">{stats.openInvoicesCount}</div>
        <div class="text-xs text-gray-500 mt-1">Offene Rechnungen</div>
        <div class="text-xs text-gray-400">{formatCurrency(stats.openInvoicesTotal)}</div>
      </div>
    </Card>
    <Card>
      <div class="text-center">
        <div class="text-2xl font-semibold text-gray-900">{stats.paidInvoicesCount}</div>
        <div class="text-xs text-gray-500 mt-1">Bezahlte Rechnungen</div>
      </div>
    </Card>
    <Card>
      <div class="text-center">
        <div class="text-2xl font-semibold text-gray-900">{formatCurrency(stats.averageInvoiceAmount)}</div>
        <div class="text-xs text-gray-500 mt-1">&Oslash; Rechnung</div>
      </div>
    </Card>
  </div>

  <!-- Tab Bar -->
  <div class="mb-6 flex gap-2">
    <button
      type="button"
      class="px-3 py-1.5 text-sm rounded-lg font-medium transition-colors {activeTab === 'overview' ? 'bg-accent-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
      onclick={() => (activeTab = 'overview')}
    >
      Übersicht
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
      class="px-3 py-1.5 text-sm rounded-lg font-medium transition-colors {activeTab === 'projects' ? 'bg-accent-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
      onclick={() => (activeTab = 'projects')}
    >
      {t('projects.title')}
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
      <h3 class="text-sm font-medium text-gray-500 mb-4">Monatlicher Umsatz</h3>
      {#if stats.monthlyRevenue.length > 0}
        <div class="flex items-end gap-1 h-40">
          {#each stats.monthlyRevenue as month}
            <div class="flex-1 flex flex-col items-center gap-1">
              <div
                class="w-full bg-accent-500 rounded-t"
                style="height: {maxRevenue > 0 ? (month.revenue / maxRevenue * 100) : 0}%"
                title="{formatCurrency(month.revenue)}"
              ></div>
              <span class="text-[10px] text-gray-400">{monthNames[month.month - 1] ?? month.month}</span>
            </div>
          {/each}
        </div>
      {:else}
        <p class="text-sm text-gray-400">{t('common.noData')}</p>
      {/if}
    </Card>

  {:else if activeTab === 'invoices'}
    {#if stats.invoices.length === 0}
      <p class="text-sm text-gray-400">{t('common.noData')}</p>
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
              {#each stats.invoices as inv (inv.id)}
                <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td class="py-3 px-3 text-gray-500">{formatDate(inv.invoiceDate)}</td>
                  <td class="py-3 px-3">
                    <a href="/invoices/{inv.id}" class="font-medium text-gray-900 hover:text-accent-600 transition-colors">
                      {inv.invoiceNumber}
                    </a>
                  </td>
                  <td class="py-3 px-3 text-gray-700">{inv.description ?? ''}</td>
                  <td class="py-3 px-3 text-right font-medium text-gray-900">{formatCurrency(inv.totalAmount)}</td>
                  <td class="py-3 px-3">
                    <Badge variant={statusVariant(inv.status)}>{statusLabel(inv.status)}</Badge>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </Card>
    {/if}

  {:else if activeTab === 'projects'}
    {#if stats.projects.length === 0}
      <p class="text-sm text-gray-400">{t('common.noData')}</p>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each stats.projects as project (project.id)}
          <a href="/projects/{project.id}" class="block hover:shadow-md transition-shadow rounded-xl">
            <Card>
              <div class="flex items-start justify-between">
                <span class="text-base font-medium text-gray-900">{project.name}</span>
                <Badge variant={project.status === 'active' ? 'green' : 'gray'}>
                  {project.status === 'active' ? t('projects.active') : t('projects.completed')}
                </Badge>
              </div>
            </Card>
          </a>
        {/each}
      </div>
    {/if}

  {:else if activeTab === 'details'}
    <form onsubmit={handleSubmit} class="max-w-2xl">
      <Card>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <Input label={t('clients.name')} bind:value={client.name} required />
          </div>
          <div class="sm:col-span-2">
            <Input label={t('clients.address')} bind:value={client.addressStreet} />
          </div>
          <Input label={t('settings.zip')} bind:value={client.addressZip} />
          <Input label={t('settings.city')} bind:value={client.addressCity} />
          <Input label={t('clients.contactPerson')} bind:value={client.contactPerson} />
          <Input label={t('clients.email')} type="email" bind:value={client.email} />
          <Input label={t('clients.phone')} bind:value={client.phone} />
          <div class="sm:col-span-2">
            <Textarea label={t('clients.notes')} bind:value={client.notes} />
          </div>
        </div>
      </Card>

      <div class="flex justify-end gap-3 mt-6">
        <Button variant="ghost" href="/clients">{t('common.cancel')}</Button>
        <Button type="submit" loading={saving}>{t('clients.save')}</Button>
      </div>
    </form>
  {/if}
{/if}
