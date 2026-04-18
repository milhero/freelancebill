<script lang="ts">
  import { onMount } from 'svelte';
  import { getDashboard } from '$lib/api/dashboard.js';
  import type { DashboardData } from '@freelancebill/shared';
  import { formatCurrency, formatDate } from '@freelancebill/shared';
  import { t } from '$lib/i18n/index.svelte.js';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';

  let data = $state<DashboardData | null>(null);
  let loading = $state(true);

  onMount(async () => {
    try {
      const res = await getDashboard();
      data = res.data;
    } catch {
      // data stays null, loading state ends
    } finally {
      loading = false;
    }
  });
</script>

<PageHeader title={t('dashboard.title')} />

{#if loading}
  <div class="flex justify-center py-12">
    <LoadingSpinner />
  </div>
{:else if data}
  <!-- KPI Cards -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
    <Card>
      <p class="text-sm text-gray-500">{t('dashboard.revenue')}</p>
      <p class="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(data.totalRevenue)}</p>
    </Card>
    <Card>
      <p class="text-sm text-gray-500">{t('dashboard.expenses')}</p>
      <p class="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(data.totalExpenses)}</p>
    </Card>
    <Card>
      <p class="text-sm text-gray-500">{t('dashboard.profit')}</p>
      <p class="mt-1 text-2xl font-semibold {data.profitLoss >= 0 ? 'text-success-600' : 'text-danger-600'}">{formatCurrency(data.profitLoss)}</p>
    </Card>
    <Card>
      <p class="text-sm text-gray-500">{t('dashboard.openInvoices')}</p>
      <p class="mt-1 text-2xl font-semibold text-gray-900">{data.openInvoicesCount}</p>
      <p class="text-sm text-gray-400">{formatCurrency(data.openInvoicesTotal)}</p>
    </Card>
    <Card>
      <p class="text-sm text-gray-500">{t('dashboard.taxFreeRemaining')}</p>
      <p class="mt-1 text-2xl font-semibold {data.taxFreeRemaining >= 0 ? 'text-success-600' : 'text-danger-600'}">{formatCurrency(data.taxFreeRemaining)}</p>
    </Card>
  </div>

  <!-- Year Comparison -->
  {#if data.yearComparison}
    {@const yc = data.yearComparison}
    <Card class="mb-8">
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('dashboard.yearComparison')}</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-gray-500 border-b border-gray-100">
              <th class="pb-2 font-medium"></th>
              <th class="pb-2 font-medium">{t('dashboard.currentYear')}</th>
              <th class="pb-2 font-medium">{t('dashboard.previousYear')}</th>
              <th class="pb-2 font-medium text-right">{t('dashboard.change')}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr>
              <td class="py-2.5 text-gray-600">{t('dashboard.revenue')}</td>
              <td class="py-2.5 font-medium text-gray-900">{formatCurrency(yc.currentYear.revenue)}</td>
              <td class="py-2.5 text-gray-500">{formatCurrency(yc.previousYear.revenue)}</td>
              <td class="py-2.5 text-right font-medium {yc.revenueChange >= 0 ? 'text-success-600' : 'text-danger-600'}">
                {yc.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(yc.revenueChange)}%
              </td>
            </tr>
            <tr>
              <td class="py-2.5 text-gray-600">{t('dashboard.expenses')}</td>
              <td class="py-2.5 font-medium text-gray-900">{formatCurrency(yc.currentYear.expenses)}</td>
              <td class="py-2.5 text-gray-500">{formatCurrency(yc.previousYear.expenses)}</td>
              <td class="py-2.5 text-right font-medium {yc.expensesChange <= 0 ? 'text-success-600' : 'text-danger-600'}">
                {yc.expensesChange >= 0 ? '↑' : '↓'} {Math.abs(yc.expensesChange)}%
              </td>
            </tr>
            <tr>
              <td class="py-2.5 text-gray-600">{t('dashboard.profit')}</td>
              <td class="py-2.5 font-medium text-gray-900">{formatCurrency(yc.currentYear.profit)}</td>
              <td class="py-2.5 text-gray-500">{formatCurrency(yc.previousYear.profit)}</td>
              <td class="py-2.5 text-right font-medium {yc.profitChange >= 0 ? 'text-success-600' : 'text-danger-600'}">
                {yc.profitChange >= 0 ? '↑' : '↓'} {Math.abs(yc.profitChange)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  {/if}

  <!-- Top Clients -->
  {#if data.topClients?.length > 0}
    <Card class="mb-8">
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('dashboard.topClients')}</h2>
      <div class="space-y-2">
        {#each data.topClients as client, i}
          <div class="flex items-center justify-between py-2 px-3 rounded-lg {i === 0 ? 'bg-accent-50' : 'bg-gray-50'}">
            <div class="flex items-center gap-3">
              <span class="text-sm font-semibold text-gray-400 w-5 text-center">{i + 1}</span>
              <span class="font-medium text-gray-900">{client.clientName}</span>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-sm text-gray-500">{client.invoiceCount} {t('dashboard.invoiceCount')}</span>
              <span class="font-medium text-gray-900 min-w-[100px] text-right">{formatCurrency(client.totalRevenue)}</span>
            </div>
          </div>
        {/each}
      </div>
    </Card>
  {/if}

  <!-- Overdue Invoices -->
  {#if data.overdueInvoices?.length > 0}
    <Card class="mb-8">
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('dashboard.overdueInvoices')}</h2>
      <div class="space-y-3">
        {#each data.overdueInvoices as inv}
          <div class="flex items-center justify-between py-2 px-3 bg-danger-50 rounded-lg">
            <div>
              <a href="/invoices/{inv.id}" class="font-medium text-gray-900 hover:text-accent-600">{inv.invoiceNumber}</a>
              <span class="text-sm text-gray-500 ml-2">{inv.clientName}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="font-medium text-gray-900">{formatCurrency(inv.totalAmount)}</span>
              <Badge variant="red">{inv.daysSinceDue} {t('dashboard.daysOverdue')}</Badge>
            </div>
          </div>
        {/each}
      </div>
    </Card>
  {/if}

  <!-- Aging Report -->
  {#if data.agingReport}
    {@const ar = data.agingReport}
    {@const agingTotal = ar.current.total + ar.days30.total + ar.days60.total + ar.days90.total + ar.days90plus.total}
    <Card class="mb-8">
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('dashboard.agingReport')}</h2>
      {#if agingTotal > 0}
        <!-- Segmented bar -->
        <div class="flex rounded-lg overflow-hidden h-3 mb-4">
          {#if ar.current.total > 0}
            <div class="bg-success-400" style="width: {(ar.current.total / agingTotal) * 100}%" title="{t('dashboard.current')}: {formatCurrency(ar.current.total)}"></div>
          {/if}
          {#if ar.days30.total > 0}
            <div class="bg-yellow-400" style="width: {(ar.days30.total / agingTotal) * 100}%" title="{t('dashboard.days30')}: {formatCurrency(ar.days30.total)}"></div>
          {/if}
          {#if ar.days60.total > 0}
            <div class="bg-orange-400" style="width: {(ar.days60.total / agingTotal) * 100}%" title="{t('dashboard.days60')}: {formatCurrency(ar.days60.total)}"></div>
          {/if}
          {#if ar.days90.total > 0}
            <div class="bg-red-400" style="width: {(ar.days90.total / agingTotal) * 100}%" title="{t('dashboard.days90')}: {formatCurrency(ar.days90.total)}"></div>
          {/if}
          {#if ar.days90plus.total > 0}
            <div class="bg-red-700" style="width: {(ar.days90plus.total / agingTotal) * 100}%" title="{t('dashboard.days90plus')}: {formatCurrency(ar.days90plus.total)}"></div>
          {/if}
        </div>
        <!-- Legend grid -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {#each [
            { label: t('dashboard.current'), bucket: ar.current, color: 'bg-success-400' },
            { label: t('dashboard.days30'), bucket: ar.days30, color: 'bg-yellow-400' },
            { label: t('dashboard.days60'), bucket: ar.days60, color: 'bg-orange-400' },
            { label: t('dashboard.days90'), bucket: ar.days90, color: 'bg-red-400' },
            { label: t('dashboard.days90plus'), bucket: ar.days90plus, color: 'bg-red-700' },
          ] as item}
            <div class="text-center">
              <div class="flex items-center justify-center gap-1.5 mb-1">
                <div class="w-2.5 h-2.5 rounded-full {item.color}"></div>
                <span class="text-xs text-gray-500">{item.label}</span>
              </div>
              <p class="text-sm font-medium text-gray-900">{formatCurrency(item.bucket.total)}</p>
              <p class="text-xs text-gray-400">{item.bucket.count} {t('dashboard.invoiceCount')}</p>
            </div>
          {/each}
        </div>
      {:else}
        <p class="text-sm text-gray-400">{t('common.noData')}</p>
      {/if}
    </Card>
  {/if}

  <!-- Monthly Chart (simple bar visualization) -->
  <Card>
    <h2 class="text-base font-semibold text-gray-900 mb-4">{t('dashboard.monthlyOverview')}</h2>
    <div class="flex items-end gap-1 h-40">
      {#each data.monthlyData ?? [] as month}
        {@const maxVal = Math.max(...data.monthlyData.map(m => Math.max(m.revenue, m.expenses)), 1)}
        <div class="flex-1 flex flex-col items-center gap-1">
          <div class="w-full flex gap-0.5 items-end" style="height: 120px">
            <div
              class="flex-1 bg-accent-400 rounded-t"
              style="height: {(month.revenue / maxVal) * 100}%"
              title="{t('dashboard.income')}: {formatCurrency(month.revenue)}"
            ></div>
            <div
              class="flex-1 bg-gray-300 rounded-t"
              style="height: {(month.expenses / maxVal) * 100}%"
              title="{t('dashboard.expenses')}: {formatCurrency(month.expenses)}"
            ></div>
          </div>
          <span class="text-[10px] text-gray-400">{month.month.split('-')[1]}</span>
        </div>
      {/each}
    </div>
    <div class="flex gap-4 mt-3 text-xs text-gray-500">
      <div class="flex items-center gap-1"><div class="w-3 h-3 bg-accent-400 rounded"></div> {t('dashboard.income')}</div>
      <div class="flex items-center gap-1"><div class="w-3 h-3 bg-gray-300 rounded"></div> {t('dashboard.expenses')}</div>
    </div>
  </Card>

  <!-- CSV Export -->
  <Card class="mt-8">
    <h2 class="text-base font-semibold text-gray-900 mb-4">{t('dashboard.csvExport')}</h2>
    <div class="flex flex-wrap gap-3">
      <a
        href="/api/exports/income?year=2026"
        download
        class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        {t('dashboard.income')} CSV
      </a>
      <a
        href="/api/exports/expenses?year=2026"
        download
        class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        {t('dashboard.expenses')} CSV
      </a>
      <a
        href="/api/exports/summary?year=2026"
        download
        class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        {t('dashboard.summary')} CSV
      </a>
    </div>
  </Card>
{/if}
