<script lang="ts">
  import { onMount } from 'svelte';
  import { getExpenses, deleteExpense } from '$lib/api/expenses.js';
  import { getTags } from '$lib/api/tags.js';
  import type { Expense, Tag } from '@freelancebill/shared';
  import { formatDate, formatCurrency } from '@freelancebill/shared';
  import { t } from '$lib/i18n/index.svelte.js';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
  import { showToast } from '$lib/stores/toast.svelte.js';

  let expenses = $state<Expense[]>([]);
  let tags = $state<Tag[]>([]);
  let selectedTagId = $state<string | undefined>(undefined);
  let fromDate = $state('');
  let toDate = $state('');
  let deleteTarget = $state<Expense | null>(null);

  onMount(async () => {
    await Promise.all([loadExpenses(), loadTags()]);
  });

  async function loadTags() {
    const res = await getTags();
    tags = res.data;
  }

  async function loadExpenses() {
    const res = await getExpenses(selectedTagId, fromDate || undefined, toDate || undefined);
    expenses = res.data;
  }

  function toggleTag(tagId: string) {
    selectedTagId = selectedTagId === tagId ? undefined : tagId;
    loadExpenses();
  }

  function onDateChange() {
    loadExpenses();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteExpense(deleteTarget.id);
      showToast(t('expenses.delete'), 'success');
      deleteTarget = null;
      await loadExpenses();
    } catch {
      showToast(t('common.error'), 'error');
    }
  }
</script>

<PageHeader title={t('expenses.title')}>
  {#snippet actions()}
    <Button href="/expenses/new">{t('expenses.new')}</Button>
  {/snippet}
</PageHeader>

<!-- Tag Filter -->
{#if tags.length > 0}
  <div class="mb-4 flex flex-wrap gap-2">
    {#each tags as tag (tag.id)}
      <button
        type="button"
        class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer"
        style="background-color: {tag.color}20; color: {tag.color}; {selectedTagId === tag.id ? `outline: 2px solid ${tag.color}; outline-offset: 1px;` : ''}"
        onclick={() => toggleTag(tag.id)}
      >
        {tag.name}
      </button>
    {/each}
  </div>
{/if}

<!-- Date Range Filter -->
<div class="mb-6 flex gap-3 max-w-md">
  <Input label={t('expenses.from')} type="date" bind:value={fromDate} onchange={onDateChange} />
  <Input label={t('expenses.to')} type="date" bind:value={toDate} onchange={onDateChange} />
</div>

{#if expenses.length === 0}
  <EmptyState title={t('common.noData')} description={t('expenses.new')}>
    {#snippet actions()}
      <Button href="/expenses/new">{t('expenses.new')}</Button>
    {/snippet}
  </EmptyState>
{:else}
  <Card>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100">
            <th class="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('expenses.date')}</th>
            <th class="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('expenses.description')}</th>
            <th class="text-right py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('expenses.amount')}</th>
            <th class="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('expenses.tags')}</th>
            <th class="py-3 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {#each expenses as expense (expense.id)}
            <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
              <td class="py-3 px-3 text-gray-500">{formatDate(expense.date)}</td>
              <td class="py-3 px-3">
                <a href="/expenses/{expense.id}" class="font-medium text-gray-900 hover:text-accent-600 transition-colors">
                  {expense.description}
                </a>
              </td>
              <td class="py-3 px-3 text-right font-medium text-gray-900">{formatCurrency(expense.amount)}</td>
              <td class="py-3 px-3">
                <div class="flex flex-wrap gap-1">
                  {#if expense.tags}
                    {#each expense.tags as tag (tag.id)}
                      <span
                        class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style="background-color: {tag.color}20; color: {tag.color}"
                      >
                        {tag.name}
                      </span>
                    {/each}
                  {/if}
                </div>
              </td>
              <td class="py-3 px-3">
                <button
                  type="button"
                  class="text-gray-300 hover:text-danger-500 transition-colors"
                  onclick={() => (deleteTarget = expense)}
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </Card>
{/if}

<ConfirmDialog
  open={deleteTarget !== null}
  title={t('expenses.delete')}
  message={t('expenses.confirmDelete')}
  onconfirm={handleDelete}
  oncancel={() => (deleteTarget = null)}
/>
