<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { createInvoice } from '$lib/api/invoices.js';
  import { getClients } from '$lib/api/clients.js';
  import { getProjects } from '$lib/api/projects.js';
  import { getSettings } from '$lib/api/settings.js';
  import type { Client, Project, Settings, BillingType, RecurringInterval } from '@freelancebill/shared';
  import { formatCurrency, toISODate } from '@freelancebill/shared';
  import { t } from '$lib/i18n/index.svelte.js';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { showToast } from '$lib/stores/toast.svelte.js';
  import InvoicePreview from '$lib/components/invoices/InvoicePreview.svelte';

  let clients = $state<Client[]>([]);
  let projects = $state<Project[]>([]);
  let settings = $state<Settings | null>(null);

  let clientId = $state('');
  let projectId = $state('');
  let description = $state('');
  let projectSubtitle = $state('');
  let billingType = $state<BillingType>('hourly');
  let hours = $state<number | ''>('');
  let hourlyRate = $state<number | ''>('');
  let fixedAmount = $state<number | ''>('');
  let invoiceDate = $state(toISODate(new Date()));
  let paymentDays = $state<number | ''>(30);
  let notes = $state('');
  let isRecurring = $state(false);
  let recurringInterval = $state<RecurringInterval>('monthly');
  let saving = $state(false);
  let serviceDateMode = $state<'single' | 'range'>('single');
  let serviceDate = $state(toISODate(new Date()));
  let servicePeriodStart = $state(toISODate(new Date()));
  let servicePeriodEnd = $state(toISODate(new Date()));

  let totalAmount = $derived(
    billingType === 'hourly'
      ? (Number(hours) || 0) * (Number(hourlyRate) || 0)
      : (Number(fixedAmount) || 0)
  );

  let isRegelbesteuerung = $derived(settings?.taxMode === 'regelbesteuerung');
  let taxRate = $derived(settings?.taxRate ?? 19);
  let taxAmount = $derived(isRegelbesteuerung ? Math.round(totalAmount * taxRate) / 100 : 0);
  let grossAmount = $derived(totalAmount + taxAmount);

  let filteredProjects = $derived(
    clientId ? projects.filter((p) => p.clientId === clientId) : projects
  );

  let selectedClient = $derived(clients.find((c) => c.id === clientId));

  let showMobilePreview = $state(false);

  function calculateDueDate(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return toISODate(d);
  }

  let previewData = $derived({
    invoiceNumber: 'VORSCHAU',
    invoiceDate: invoiceDate,
    paymentDueDate: calculateDueDate(invoiceDate, Number(paymentDays) || 30),
    description: description,
    projectSubtitle: projectSubtitle,
    billingType: billingType,
    hours: billingType === 'hourly' ? Number(hours) || 0 : undefined,
    hourlyRate: billingType === 'hourly' ? Number(hourlyRate) || 0 : undefined,
    fixedAmount: billingType === 'fixed' ? Number(fixedAmount) || 0 : undefined,
    totalAmount: totalAmount,
    notes: notes,
    clientName: selectedClient?.name || '',
    clientStreet: selectedClient?.addressStreet || '',
    clientZip: selectedClient?.addressZip || '',
    clientCity: selectedClient?.addressCity || '',
    senderName: settings?.fullName || '',
    senderStreet: settings?.addressStreet || '',
    senderZip: settings?.addressZip || '',
    senderCity: settings?.addressCity || '',
    senderEmail: settings?.email || '',
    senderPhone: settings?.phone || '',
    senderIban: settings?.iban || '',
    senderBic: settings?.bic || '',
    senderBank: settings?.bankName || '',
    paymentDays: Number(paymentDays) || 30,
    taxMode: settings?.taxMode || 'kleinunternehmer',
    taxRate: settings?.taxRate ?? 19,
    taxId: settings?.taxId || null,
    vatId: settings?.vatId || null,
    showVatNote: settings?.taxMode !== 'regelbesteuerung',
    serviceDate: serviceDateMode === 'single' ? serviceDate : undefined,
    servicePeriodStart: serviceDateMode === 'range' ? servicePeriodStart : undefined,
    servicePeriodEnd: serviceDateMode === 'range' ? servicePeriodEnd : undefined,
  });

  onMount(async () => {
    const [clientsRes, projectsRes, settingsRes] = await Promise.all([
      getClients(),
      getProjects(),
      getSettings(),
    ]);
    clients = clientsRes.data;
    projects = projectsRes.data;
    settings = settingsRes.data;

    if (settings) {
      if (settings.defaultHourlyRate) hourlyRate = settings.defaultHourlyRate;
      if (settings.defaultPaymentDays) paymentDays = settings.defaultPaymentDays;
    }
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    saving = true;
    try {
      await createInvoice({
        clientId,
        projectId: projectId || undefined,
        description,
        projectSubtitle: projectSubtitle || undefined,
        billingType,
        hours: billingType === 'hourly' ? Number(hours) : undefined,
        hourlyRate: billingType === 'hourly' ? Number(hourlyRate) : undefined,
        fixedAmount: billingType === 'fixed' ? Number(fixedAmount) : undefined,
        invoiceDate,
        paymentDays: Number(paymentDays),
        isRecurring,
        recurringInterval: isRecurring ? recurringInterval : undefined,
        notes: notes || undefined,
        serviceDate: serviceDateMode === 'single' ? serviceDate : undefined,
        servicePeriodStart: serviceDateMode === 'range' ? servicePeriodStart : undefined,
        servicePeriodEnd: serviceDateMode === 'range' ? servicePeriodEnd : undefined,
      });
      showToast(t('common.success'), 'success');
      goto('/invoices');
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      saving = false;
    }
  }
</script>

<PageHeader title={t('invoices.new')} />

<div class="flex flex-col lg:flex-row gap-6">
  <!-- Left side: Form (60%) -->
  <form onsubmit={handleSubmit} class="w-full lg:w-3/5 space-y-6">
    {#if settings && !settings.taxId && !settings.vatId}
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
        {t('invoices.taxIdWarning')}
      </div>
    {/if}
    <Card>
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('invoices.client')} & {t('invoices.project')}</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select label={t('invoices.client')} bind:value={clientId} required>
          <option value="">-- {t('invoices.client')} --</option>
          {#each clients as c}
            <option value={c.id}>{c.name}</option>
          {/each}
        </Select>
        <Select label="{t('invoices.project')} ({t('invoices.notes')})" bind:value={projectId}>
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
        <Input label={t('invoices.description')} bind:value={description} required />
        <Input label={t('invoices.projectSubtitle')} bind:value={projectSubtitle} />

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">{t('invoices.billingHourly')} / {t('invoices.billingFixed')}</label>
          <div class="flex gap-2">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {billingType === 'hourly' ? 'bg-accent-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
              onclick={() => (billingType = 'hourly')}
            >
              {t('invoices.billingHourly')}
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {billingType === 'fixed' ? 'bg-accent-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
              onclick={() => (billingType = 'fixed')}
            >
              {t('invoices.billingFixed')}
            </button>
          </div>
        </div>

        {#if billingType === 'hourly'}
          <div class="grid grid-cols-2 gap-4">
            <Input label={t('invoices.hours')} type="number" step="0.25" min="0" bind:value={hours} required />
            <Input label={t('invoices.hourlyRate')} type="number" step="0.01" min="0" bind:value={hourlyRate} required />
          </div>
        {:else}
          <Input label={t('invoices.fixedAmount')} type="number" step="0.01" min="0" bind:value={fixedAmount} required />
        {/if}

        <div class="bg-gray-50 rounded-lg p-4">
          {#if isRegelbesteuerung}
            <div class="flex justify-between text-sm text-gray-500">
              <span>{t('invoices.netAmount')}:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            <div class="flex justify-between text-sm text-gray-500 mt-1">
              <span>{t('invoices.taxAmount')} ({taxRate}%):</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div class="flex justify-between mt-2 pt-2 border-t border-gray-200">
              <span class="text-sm font-semibold text-gray-900">{t('invoices.grossAmount')}:</span>
              <span class="text-lg font-semibold text-gray-900">{formatCurrency(grossAmount)}</span>
            </div>
          {:else}
            <div class="text-right">
              <span class="text-sm text-gray-500">{t('invoices.total')}:</span>
              <span class="ml-2 text-lg font-semibold text-gray-900">{formatCurrency(totalAmount)}</span>
            </div>
          {/if}
        </div>
      </div>
    </Card>

    <Card>
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('invoices.date')}</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label={t('invoices.date')} type="date" bind:value={invoiceDate} required />
        <Input label={t('invoices.paymentDays')} type="number" min="1" bind:value={paymentDays} required />
        <div class="sm:col-span-2">
          <Textarea label={t('invoices.notes')} bind:value={notes} />
        </div>
      </div>
    </Card>

    <Card>
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('invoices.serviceDate')}</h2>
      <div class="space-y-4">
        <div class="flex gap-2">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {serviceDateMode === 'single' ? 'bg-accent-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
            onclick={() => (serviceDateMode = 'single')}
          >
            {t('invoices.singleDate')}
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {serviceDateMode === 'range' ? 'bg-accent-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
            onclick={() => (serviceDateMode = 'range')}
          >
            {t('invoices.dateRange')}
          </button>
        </div>
        {#if serviceDateMode === 'single'}
          <Input label={t('invoices.serviceDate')} type="date" bind:value={serviceDate} />
        {:else}
          <div class="grid grid-cols-2 gap-4">
            <Input label={t('invoices.serviceDateFrom')} type="date" bind:value={servicePeriodStart} />
            <Input label={t('invoices.serviceDateTo')} type="date" bind:value={servicePeriodEnd} />
          </div>
        {/if}
      </div>
    </Card>

    <Card>
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('invoices.recurring')}</h2>
      <div class="space-y-4">
        <label class="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={isRecurring}
            class="h-4 w-4 rounded border-gray-300 text-accent-600 focus:ring-accent-500"
          />
          <span class="text-sm font-medium text-gray-700">{t('invoices.recurring')}</span>
        </label>

        {#if isRecurring}
          <Select label={t('invoices.recurringInterval')} bind:value={recurringInterval} required>
            <option value="monthly">{t('invoices.monthly')}</option>
            <option value="quarterly">{t('invoices.quarterly')}</option>
            <option value="yearly">{t('invoices.yearly')}</option>
          </Select>
        {/if}
      </div>
    </Card>

    <div class="flex justify-end gap-3">
      <Button variant="ghost" href="/invoices">{t('common.cancel')}</Button>
      <!-- Mobile preview button -->
      <Button variant="ghost" type="button" onclick={() => (showMobilePreview = true)} class="lg:hidden">
        {t('invoices.previewPdf')}
      </Button>
      <Button type="submit" loading={saving}>{t('invoices.create')}</Button>
    </div>
  </form>

  <!-- Right side: PDF Preview (40%) - desktop only -->
  <div class="hidden lg:block w-2/5 sticky top-6 self-start h-[calc(100vh-8rem)]">
    <InvoicePreview formData={previewData} />
  </div>
</div>

<!-- Mobile preview modal -->
{#if showMobilePreview}
  <div class="fixed inset-0 z-50 lg:hidden">
    <!-- Backdrop -->
    <button
      class="absolute inset-0 bg-black/50"
      onclick={() => (showMobilePreview = false)}
      aria-label="Close preview"
    ></button>
    <!-- Modal content -->
    <div class="absolute inset-4 top-8 bg-white dark:bg-gray-100 rounded-2xl shadow-xl overflow-hidden flex flex-col">
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 class="text-sm font-semibold text-gray-900">{t('invoices.previewPdf')}</h3>
        <button
          class="text-gray-400 hover:text-gray-600 text-xl leading-none"
          onclick={() => (showMobilePreview = false)}
          aria-label="Close"
        >&times;</button>
      </div>
      <div class="flex-1 overflow-hidden">
        <InvoicePreview formData={previewData} />
      </div>
    </div>
  </div>
{/if}
