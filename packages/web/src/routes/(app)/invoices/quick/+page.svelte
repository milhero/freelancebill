<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getSettings } from '$lib/api/settings.js';
  import type { Settings, BillingType } from '@freelancebill/shared';
  import { formatCurrency, toISODate } from '@freelancebill/shared';
  import { t } from '$lib/i18n/index.svelte.js';
  import Card from '$lib/components/ui/Card.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { showToast } from '$lib/stores/toast.svelte.js';
  import InvoicePreview from '$lib/components/invoices/InvoicePreview.svelte';

  let settings = $state<Settings | null>(null);

  // Sender fields
  let senderName = $state('');
  let senderStreet = $state('');
  let senderZip = $state('');
  let senderCity = $state('');
  let senderEmail = $state('');
  let senderPhone = $state('');
  let senderIban = $state('');
  let senderBic = $state('');
  let senderBank = $state('');

  // Recipient fields
  let clientName = $state('');
  let clientStreet = $state('');
  let clientZip = $state('');
  let clientCity = $state('');

  // Invoice details
  let invoiceNumber = $state('');
  let invoiceDate = $state(toISODate(new Date()));
  let paymentDays = $state<number | ''>(30);
  let description = $state('');
  let projectSubtitle = $state('');
  let billingType = $state<BillingType>('hourly');
  let hours = $state<number | ''>('');
  let hourlyRate = $state<number | ''>('');
  let fixedAmount = $state<number | ''>('');
  let notes = $state('');
  let showVatNote = $state(true);

  let downloading = $state(false);
  let showMobilePreview = $state(false);
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

  function calculateDueDate(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return toISODate(d);
  }

  let previewData = $derived({
    invoiceNumber: invoiceNumber || 'ENTWURF',
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
    clientName: clientName,
    clientStreet: clientStreet,
    clientZip: clientZip,
    clientCity: clientCity,
    senderName: senderName,
    senderStreet: senderStreet,
    senderZip: senderZip,
    senderCity: senderCity,
    senderEmail: senderEmail,
    senderPhone: senderPhone,
    senderIban: senderIban,
    senderBic: senderBic,
    senderBank: senderBank,
    showVatNote: showVatNote,
    paymentDays: Number(paymentDays) || 30,
    taxMode: settings?.taxMode || 'kleinunternehmer',
    taxRate: settings?.taxRate ?? 19,
    taxId: settings?.taxId || null,
    vatId: settings?.vatId || null,
    serviceDate: serviceDateMode === 'single' ? serviceDate : undefined,
    servicePeriodStart: serviceDateMode === 'range' ? servicePeriodStart : undefined,
    servicePeriodEnd: serviceDateMode === 'range' ? servicePeriodEnd : undefined,
  });

  onMount(async () => {
    try {
      const res = await getSettings();
      settings = res.data;
      if (settings) {
        senderName = settings.fullName || '';
        senderStreet = settings.addressStreet || '';
        senderZip = settings.addressZip || '';
        senderCity = settings.addressCity || '';
        senderEmail = settings.email || '';
        senderPhone = settings.phone || '';
        senderIban = settings.iban || '';
        senderBic = settings.bic || '';
        senderBank = settings.bankName || '';
        if (settings.defaultHourlyRate) hourlyRate = settings.defaultHourlyRate;
        if (settings.defaultPaymentDays) paymentDays = settings.defaultPaymentDays;
        // Auto-set VAT note based on tax mode
        showVatNote = settings.taxMode !== 'regelbesteuerung';
      }
    } catch {
      // silent
    }
  });

  async function handleDownload() {
    downloading = true;
    try {
      const res = await fetch('/api/invoices/preview-pdf?download=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(previewData),
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rechnung-${invoiceNumber || 'Entwurf'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(t('common.success'), 'success');
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      downloading = false;
    }
  }
</script>

<div class="mb-6">
  <h1 class="text-lg font-semibold text-gray-900">{t('invoices.quickInvoice')}</h1>
  <p class="text-sm text-gray-500 mt-0.5">{t('invoices.quickInvoiceSubtitle')}</p>
</div>

<div class="flex flex-col lg:flex-row gap-6">
  <!-- Left side: Form (60%) -->
  <div class="w-full lg:w-3/5 space-y-6">
    <!-- Sender -->
    <Card>
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('invoices.sender')}</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2">
          <Input label={t('settings.fullName')} bind:value={senderName} />
        </div>
        <div class="sm:col-span-2">
          <Input label={t('settings.street')} bind:value={senderStreet} />
        </div>
        <Input label={t('settings.zip')} bind:value={senderZip} />
        <Input label={t('settings.city')} bind:value={senderCity} />
        <Input label={t('settings.email')} type="email" bind:value={senderEmail} />
        <Input label={t('settings.phone')} bind:value={senderPhone} />
        <Input label={t('settings.iban')} bind:value={senderIban} />
        <Input label={t('settings.bic')} bind:value={senderBic} />
        <div class="sm:col-span-2">
          <Input label={t('settings.bankName')} bind:value={senderBank} />
        </div>
      </div>
    </Card>

    <!-- Recipient -->
    <Card>
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('invoices.recipient')}</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2">
          <Input label={t('clients.name')} bind:value={clientName} />
        </div>
        <div class="sm:col-span-2">
          <Input label={t('settings.street')} bind:value={clientStreet} />
        </div>
        <Input label={t('settings.zip')} bind:value={clientZip} />
        <Input label={t('settings.city')} bind:value={clientCity} />
      </div>
    </Card>

    <!-- Invoice Details -->
    <Card>
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('invoices.details')}</h2>
      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Input label={t('invoices.invoiceNumber')} bind:value={invoiceNumber} />
            <p class="text-xs text-gray-400 mt-1">{t('invoices.invoiceNumberHint')}</p>
          </div>
          <Input label={t('invoices.date')} type="date" bind:value={invoiceDate} />
          <Input label={t('invoices.paymentDays')} type="number" min="1" bind:value={paymentDays} />
        </div>

        <Input label={t('invoices.description')} bind:value={description} />
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
            <Input label={t('invoices.hours')} type="number" step="0.25" min="0" bind:value={hours} />
            <Input label={t('invoices.hourlyRate')} type="number" step="0.01" min="0" bind:value={hourlyRate} />
          </div>
        {:else}
          <Input label={t('invoices.fixedAmount')} type="number" step="0.01" min="0" bind:value={fixedAmount} />
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

        <Textarea label={t('invoices.notes')} bind:value={notes} />

        <label class="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={showVatNote}
            class="h-4 w-4 rounded border-gray-300 text-accent-600 focus:ring-accent-500"
          />
          <span class="text-sm font-medium text-gray-700">{t('invoices.vatNote')}</span>
        </label>
      </div>
    </Card>

    <!-- Leistungsdatum -->
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

    <div class="flex justify-end gap-3">
      <Button variant="ghost" href="/invoices">{t('common.cancel')}</Button>
      <!-- Mobile preview button -->
      <Button variant="ghost" type="button" onclick={() => (showMobilePreview = true)} class="lg:hidden">
        {t('invoices.previewPdf')}
      </Button>
      <Button onclick={handleDownload} loading={downloading}>{t('invoices.downloadPdf')}</Button>
    </div>
  </div>

  <!-- Right side: PDF Preview (40%) - desktop only -->
  <div class="hidden lg:block w-2/5 sticky top-6 self-start h-[calc(100vh-8rem)]">
    <InvoicePreview formData={previewData} />
  </div>
</div>

<!-- Mobile preview modal -->
{#if showMobilePreview}
  <div class="fixed inset-0 z-50 lg:hidden">
    <button
      class="absolute inset-0 bg-black/50"
      onclick={() => (showMobilePreview = false)}
      aria-label="Close preview"
    ></button>
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
