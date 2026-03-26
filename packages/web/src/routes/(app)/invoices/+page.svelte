<script lang="ts">
  import { onMount } from 'svelte';
  import { getInvoices, cancelInvoice, createReminder } from '$lib/api/invoices.js';
  import type { Invoice } from '@freelancebill/shared';
  import { formatDate, formatCurrency, daysBetween } from '@freelancebill/shared';
  import { t } from '$lib/i18n/index.svelte.js';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
  import InvoiceStatusModal from '$lib/components/invoices/InvoiceStatusModal.svelte';
  import { showToast } from '$lib/stores/toast.svelte.js';

  let invoices = $state<Invoice[]>([]);
  let filter = $state<'all' | 'open' | 'paid' | 'overdue' | 'cancelled'>('all');
  let cancelTarget = $state<Invoice | null>(null);
  let statusModalOpen = $state(false);
  let statusModalInvoiceId = $state('');

  let filteredInvoices = $derived(
    filter === 'all'
      ? invoices
      : filter === 'overdue'
        ? invoices.filter((inv: any) => inv.overdue)
        : filter === 'open'
          ? invoices.filter((inv: any) => inv.status === 'open' && !inv.overdue)
          : filter === 'cancelled'
            ? invoices.filter((inv: any) => inv.status === 'cancelled')
            : invoices.filter((inv) => inv.status === filter)
  );

  onMount(loadInvoices);

  async function loadInvoices() {
    const res = await getInvoices();
    invoices = res.data;
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    try {
      await cancelInvoice(cancelTarget.id);
      showToast(t('invoices.cancelledSuccess'), 'success');
      cancelTarget = null;
      await loadInvoices();
    } catch {
      showToast(t('common.error'), 'error');
    }
  }

  function openStatusModal(invoice: Invoice) {
    statusModalInvoiceId = invoice.id;
    statusModalOpen = true;
  }

  function overdueDays(invoice: Invoice): number {
    return daysBetween(invoice.paymentDueDate, new Date());
  }

  let reminderLoading = $state<string | null>(null);

  async function handleReminder(invoice: Invoice) {
    reminderLoading = invoice.id;
    try {
      const blob = await createReminder(invoice.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const level = (invoice.reminderCount ?? 0) + 1;
      const label = level <= 1 ? 'Zahlungserinnerung' : `Mahnung-${level}`;
      a.download = `${label}-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(t('invoices.reminderSent'), 'success');
      await loadInvoices();
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      reminderLoading = null;
    }
  }
</script>

<PageHeader title={t('invoices.title')}>
  {#snippet actions()}
    <div class="flex items-center gap-3">
      <a href="/invoices/quick" class="text-sm text-gray-500 hover:text-accent-600 transition-colors">
        {t('invoices.quickInvoiceLink')}
      </a>
      <Button href="/invoices/new">{t('invoices.new')}</Button>
    </div>
  {/snippet}
</PageHeader>

<div class="mb-6 flex gap-2">
  <button
    type="button"
    class="px-3 py-1.5 text-sm rounded-lg font-medium transition-colors {filter === 'all' ? 'bg-accent-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
    onclick={() => (filter = 'all')}
  >
    {t('invoices.all')}
  </button>
  <button
    type="button"
    class="px-3 py-1.5 text-sm rounded-lg font-medium transition-colors {filter === 'open' ? 'bg-warning-100 text-warning-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
    onclick={() => (filter = 'open')}
  >
    {t('invoices.open')}
  </button>
  <button
    type="button"
    class="px-3 py-1.5 text-sm rounded-lg font-medium transition-colors {filter === 'paid' ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
    onclick={() => (filter = 'paid')}
  >
    {t('invoices.paid')}
  </button>
  <button
    type="button"
    class="px-3 py-1.5 text-sm rounded-lg font-medium transition-colors {filter === 'overdue' ? 'bg-danger-100 text-danger-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
    onclick={() => (filter = 'overdue')}
  >
    {t('invoices.overdue')}
  </button>
  <button
    type="button"
    class="px-3 py-1.5 text-sm rounded-lg font-medium transition-colors {filter === 'cancelled' ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
    onclick={() => (filter = 'cancelled')}
  >
    {t('invoices.cancelled')}
  </button>
</div>

{#if filteredInvoices.length === 0}
  <EmptyState title={t('common.noData')} description={t('invoices.new')}>
    {#snippet actions()}
      <Button href="/invoices/new">{t('invoices.new')}</Button>
    {/snippet}
  </EmptyState>
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
            <th class="py-3 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {#each filteredInvoices as invoice (invoice.id)}
            <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
              <td class="py-3 px-3 text-gray-500">{formatDate(invoice.invoiceDate)}</td>
              <td class="py-3 px-3">
                <a href="/invoices/{invoice.id}" class="font-medium text-gray-900 hover:text-accent-600 transition-colors">
                  {invoice.invoiceNumber}
                </a>
              </td>
              <td class="py-3 px-3 text-gray-700">{invoice.description}</td>
              <td class="py-3 px-3 text-right font-medium text-gray-900">{formatCurrency(invoice.totalAmount)}</td>
              <td class="py-3 px-3">
                {#if (invoice as any).status === 'cancelled'}
                  <Badge variant="gray"><span class="line-through">{t('invoices.cancelled')}</span></Badge>
                {:else if invoice.status === 'paid'}
                  <Badge variant="green">{t('invoices.paid')}</Badge>
                {:else if (invoice as any).overdue}
                  <Badge variant="red" onclick={() => openStatusModal(invoice)}>{t('invoices.overdue')} ({overdueDays(invoice)} {t('dashboard.daysOverdue')})</Badge>
                {:else}
                  <Badge variant="yellow" onclick={() => openStatusModal(invoice)}>{t('invoices.open')}</Badge>
                {/if}
              </td>
              <td class="py-3 px-3">
                <div class="flex items-center gap-2 justify-end">
                  {#if (invoice as any).overdue}
                    <button
                      type="button"
                      class="text-xs px-2 py-1 rounded bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors font-medium disabled:opacity-50"
                      aria-label={t('invoices.createReminder')}
                      onclick={() => handleReminder(invoice)}
                      disabled={reminderLoading === invoice.id}
                    >
                      {#if reminderLoading === invoice.id}
                        ...
                      {:else}
                        {t('invoices.reminder')}
                      {/if}
                    </button>
                  {/if}
                  {#if invoice.status !== 'paid' && (invoice as any).status !== 'cancelled'}
                    <button
                      type="button"
                      class="text-xs px-2 py-1 rounded bg-gray-50 text-gray-500 hover:bg-danger-50 hover:text-danger-600 transition-colors font-medium"
                      aria-label={t('invoices.cancelInvoice')}
                      onclick={() => (cancelTarget = invoice)}
                    >
                      {t('invoices.cancelInvoice')}
                    </button>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </Card>
{/if}

<ConfirmDialog
  open={cancelTarget !== null}
  title={t('invoices.cancelInvoice')}
  message={t('invoices.confirmCancel')}
  onconfirm={handleCancel}
  oncancel={() => (cancelTarget = null)}
/>

<InvoiceStatusModal
  open={statusModalOpen}
  invoiceId={statusModalInvoiceId}
  onclose={() => (statusModalOpen = false)}
  onstatusChanged={() => { statusModalOpen = false; loadInvoices(); }}
/>
