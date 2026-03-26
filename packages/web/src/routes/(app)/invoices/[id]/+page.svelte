<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getInvoice, updateInvoice, getInvoicePdfUrl, createReminder } from '$lib/api/invoices.js';
  import { getClients } from '$lib/api/clients.js';
  import { getProjects } from '$lib/api/projects.js';
  import type { Invoice, Client, Project } from '@freelancebill/shared';
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

  let invoice = $state<Invoice | null>(null);
  let clients = $state<Client[]>([]);
  let projects = $state<Project[]>([]);
  let saving = $state(false);
  let reminderLoading = $state(false);

  let isPaid = $derived(invoice?.status === 'paid');
  let isOverdue = $derived(
    invoice ? invoice.status === 'open' && invoice.paymentDueDate < new Date().toISOString().split('T')[0] : false
  );

  let totalAmount = $derived(
    invoice
      ? invoice.billingType === 'hourly'
        ? (Number(invoice.hours) || 0) * (Number(invoice.hourlyRate) || 0)
        : (Number(invoice.fixedAmount) || 0)
      : 0
  );

  let filteredProjects = $derived(
    invoice?.clientId ? projects.filter((p) => p.clientId === invoice!.clientId) : projects
  );

  onMount(async () => {
    const [invoiceRes, clientsRes, projectsRes] = await Promise.all([
      getInvoice($page.params.id),
      getClients(),
      getProjects(),
    ]);
    invoice = invoiceRes.data;
    clients = clientsRes.data;
    projects = projectsRes.data;
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!invoice || isPaid) return;
    saving = true;
    try {
      await updateInvoice(invoice.id, {
        clientId: invoice.clientId,
        projectId: invoice.projectId || undefined,
        description: invoice.description,
        projectSubtitle: invoice.projectSubtitle || undefined,
        billingType: invoice.billingType,
        hours: invoice.billingType === 'hourly' ? Number(invoice.hours) : undefined,
        hourlyRate: invoice.billingType === 'hourly' ? Number(invoice.hourlyRate) : undefined,
        fixedAmount: invoice.billingType === 'fixed' ? Number(invoice.fixedAmount) : undefined,
        paymentDays: invoice.paymentDays,
        notes: invoice.notes || undefined,
      });
      showToast(t('common.success'), 'success');
      goto('/invoices');
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      saving = false;
    }
  }

  function openPdf() {
    if (invoice) {
      window.open(getInvoicePdfUrl(invoice.id), '_blank');
    }
  }

  function downloadPdf() {
    if (invoice) {
      window.open(getInvoicePdfUrl(invoice.id, true), '_blank');
    }
  }

  async function handleReminder() {
    if (!invoice) return;
    reminderLoading = true;
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
      // Reload invoice to update reminder count
      const res = await getInvoice($page.params.id);
      invoice = res.data;
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      reminderLoading = false;
    }
  }
</script>

{#if invoice}
  <PageHeader title="{t('invoices.number')} {invoice.invoiceNumber}">
    {#snippet actions()}
      <div class="flex items-center gap-2">
        {#if invoice.status === 'paid'}
          <Badge variant="green">{t('invoices.paidDate')} {formatDate(invoice.paidDate!)}</Badge>
        {:else if invoice.status === 'overdue'}
          <Badge variant="red">{t('invoices.overdue')}</Badge>
        {:else}
          <Badge variant="yellow">{t('invoices.open')}</Badge>
        {/if}
        <Button variant="secondary" onclick={openPdf}>{t('invoices.previewPdf')}</Button>
        <Button variant="secondary" onclick={downloadPdf}>{t('invoices.downloadPdf')}</Button>
        {#if isOverdue}
          <Button onclick={handleReminder} loading={reminderLoading}>{t('invoices.createReminder')}</Button>
        {/if}
      </div>
    {/snippet}
  </PageHeader>

  <form onsubmit={handleSubmit} class="max-w-2xl space-y-6">
    <Card>
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('invoices.client')} & {t('invoices.project')}</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select label={t('invoices.client')} bind:value={invoice.clientId} disabled={isPaid} required>
          <option value="">-- {t('invoices.client')} --</option>
          {#each clients as c}
            <option value={c.id}>{c.name}</option>
          {/each}
        </Select>
        <Select label={t('invoices.project')} bind:value={invoice.projectId} disabled={isPaid}>
          <option value="">-- {t('invoices.project')} --</option>
          {#each filteredProjects as p}
            <option value={p.id}>{p.name}</option>
          {/each}
        </Select>
      </div>
    </Card>

    <Card>
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('invoices.description')}</h2>
      <div class="space-y-4">
        <Input label={t('invoices.description')} bind:value={invoice.description} disabled={isPaid} required />
        <Input label={t('invoices.projectSubtitle')} bind:value={invoice.projectSubtitle} disabled={isPaid} />

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">{t('invoices.billingHourly')} / {t('invoices.billingFixed')}</label>
          <div class="flex gap-2">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {invoice.billingType === 'hourly' ? 'bg-accent-600 text-white' : 'bg-gray-100 text-gray-600'}"
              onclick={() => { if (invoice) invoice.billingType = 'hourly'; }}
              disabled={isPaid}
            >{t('invoices.billingHourly')}</button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {invoice.billingType === 'fixed' ? 'bg-accent-600 text-white' : 'bg-gray-100 text-gray-600'}"
              onclick={() => { if (invoice) invoice.billingType = 'fixed'; }}
              disabled={isPaid}
            >{t('invoices.billingFixed')}</button>
          </div>
        </div>

        {#if invoice.billingType === 'hourly'}
          <div class="grid grid-cols-2 gap-4">
            <Input label={t('invoices.hours')} type="number" step="0.25" bind:value={invoice.hours} disabled={isPaid} />
            <Input label={t('invoices.hourlyRate')} type="number" step="0.01" bind:value={invoice.hourlyRate} disabled={isPaid} />
          </div>
        {:else}
          <Input label={t('invoices.fixedAmount')} type="number" step="0.01" bind:value={invoice.fixedAmount} disabled={isPaid} />
        {/if}

        <div class="bg-gray-50 rounded-lg p-4 text-right">
          <span class="text-sm text-gray-500">{t('invoices.total')}:</span>
          <span class="ml-2 text-lg font-semibold text-gray-900">{formatCurrency(totalAmount)}</span>
        </div>
      </div>
    </Card>

    <Card>
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('invoices.date')}</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label={t('invoices.date')} type="date" value={invoice.invoiceDate} disabled />
        <Input label={t('invoices.paymentDays')} type="number" bind:value={invoice.paymentDays} disabled={isPaid} />
        {#if isPaid && invoice.paidDate}
          <Input label={t('invoices.paidDate')} type="date" value={invoice.paidDate} disabled />
        {/if}
        <div class="sm:col-span-2">
          <Textarea label={t('invoices.notes')} bind:value={invoice.notes} disabled={isPaid} />
        </div>
      </div>
    </Card>

    {#if isOverdue}
      <Card>
        <h2 class="text-base font-semibold text-gray-900 mb-4">{t('invoices.reminderHistory')}</h2>
        <div class="space-y-3">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">{t('invoices.reminderCount')}:</span>
            <span class="font-medium text-gray-900">{invoice.reminderCount ?? 0}</span>
          </div>
          {#if invoice.lastReminderDate}
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-500">{t('invoices.lastReminder')}:</span>
              <span class="font-medium text-gray-900">{formatDate(invoice.lastReminderDate)}</span>
            </div>
          {:else}
            <p class="text-sm text-gray-400">{t('invoices.noReminders')}</p>
          {/if}
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">{t('invoices.nextReminderLevel')}:</span>
            <span class="font-medium text-gray-900">
              {#if (invoice.reminderCount ?? 0) === 0}
                1 — {t('invoices.paymentReminder')}
              {:else if (invoice.reminderCount ?? 0) === 1}
                2 — {t('invoices.reminder')}
              {:else}
                3 — {t('invoices.reminder')} ({t('invoices.reminderLevel')} 3)
              {/if}
            </span>
          </div>
          <div class="pt-2">
            <Button variant="secondary" onclick={handleReminder} loading={reminderLoading}>
              {t('invoices.createReminder')}
            </Button>
          </div>
        </div>
      </Card>
    {/if}

    {#if !isPaid}
      <div class="flex justify-end gap-3">
        <Button variant="ghost" href="/invoices">{t('common.cancel')}</Button>
        <Button type="submit" loading={saving}>{t('invoices.save')}</Button>
      </div>
    {/if}
  </form>
{/if}
