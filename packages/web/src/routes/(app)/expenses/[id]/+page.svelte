<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getExpense, updateExpense, uploadReceipt, deleteReceipt } from '$lib/api/expenses.js';
  import { getTags } from '$lib/api/tags.js';
  import type { Expense, Tag } from '@freelancebill/shared';
  import { t } from '$lib/i18n/index.svelte.js';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { showToast } from '$lib/stores/toast.svelte.js';

  let expense = $state<Expense | null>(null);
  let tags = $state<Tag[]>([]);
  let selectedTagIds = $state<string[]>([]);
  let saving = $state(false);
  let uploading = $state(false);
  let fileInput = $state<HTMLInputElement | null>(null);

  async function handleReceiptUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !expense) return;
    uploading = true;
    try {
      const res = await uploadReceipt(expense.id, file);
      expense.receiptPath = res.data.receiptPath;
      showToast(t('common.success'), 'success');
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      uploading = false;
      if (input) input.value = '';
    }
  }

  async function handleDeleteReceipt() {
    if (!expense) return;
    uploading = true;
    try {
      await deleteReceipt(expense.id);
      expense.receiptPath = null;
      showToast(t('common.success'), 'success');
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      uploading = false;
    }
  }

  onMount(async () => {
    const [expenseRes, tagsRes] = await Promise.all([
      getExpense($page.params.id),
      getTags(),
    ]);
    expense = expenseRes.data;
    tags = tagsRes.data;
    if (expense?.tags) {
      selectedTagIds = expense.tags.map((t) => t.id);
    }
  });

  function toggleTag(tagId: string) {
    if (selectedTagIds.includes(tagId)) {
      selectedTagIds = selectedTagIds.filter((id) => id !== tagId);
    } else {
      selectedTagIds = [...selectedTagIds, tagId];
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!expense) return;
    saving = true;
    try {
      await updateExpense(expense.id, {
        date: expense.date,
        description: expense.description,
        amount: expense.amount,
        paymentMethod: expense.paymentMethod || undefined,
        notes: expense.notes || undefined,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      });
      showToast(t('common.success'), 'success');
      goto('/expenses');
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      saving = false;
    }
  }
</script>

{#if expense}
  <PageHeader title={t('common.edit')} />

  <form onsubmit={handleSubmit} class="max-w-2xl">
    <Card>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label={t('expenses.date')} type="date" bind:value={expense.date} required />
        <div class="sm:col-span-2">
          <Input label={t('expenses.description')} bind:value={expense.description} required />
        </div>
        <Input label={t('expenses.amount')} type="number" step="0.01" bind:value={expense.amount} required />
        <Input label={t('expenses.paymentMethod')} bind:value={expense.paymentMethod} />

        <!-- Tags -->
        {#if tags.length > 0}
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-2">{t('expenses.tags')}</label>
            <div class="flex flex-wrap gap-2">
              {#each tags as tag (tag.id)}
                <button
                  type="button"
                  class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer"
                  style="background-color: {tag.color}20; color: {tag.color}; {selectedTagIds.includes(tag.id) ? `outline: 2px solid ${tag.color}; outline-offset: 1px;` : ''}"
                  onclick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <div class="sm:col-span-2">
          <Textarea label={t('expenses.notes')} bind:value={expense.notes} />
        </div>

        <!-- Receipt upload -->
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">{t('expenses.tags')}</label>
          {#if expense.receiptPath}
            <div class="flex items-start gap-4 rounded-lg border border-gray-200 p-4 bg-gray-50">
              {#if expense.receiptPath.endsWith('.pdf')}
                <a
                  href={expense.receiptPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  PDF
                </a>
              {:else}
                <a href={expense.receiptPath} target="_blank" rel="noopener noreferrer">
                  <img
                    src={expense.receiptPath}
                    alt="Receipt"
                    class="max-h-48 rounded border border-gray-200 object-contain"
                  />
                </a>
              {/if}
              <button
                type="button"
                class="ml-auto text-sm text-red-600 hover:text-red-800 cursor-pointer"
                disabled={uploading}
                onclick={handleDeleteReceipt}
              >
                {t('common.delete')}
              </button>
            </div>
          {:else}
            <div class="flex items-center gap-3">
              <input
                bind:this={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                class="hidden"
                onchange={handleReceiptUpload}
              />
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white dark:bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 cursor-pointer"
                disabled={uploading}
                onclick={() => fileInput?.click()}
              >
                {#if uploading}
                  {t('common.loading')}
                {:else}
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload
                {/if}
              </button>
              <span class="text-xs text-gray-500">JPEG, PNG, WebP, PDF (max. 10 MB)</span>
            </div>
          {/if}
        </div>
      </div>
    </Card>

    <div class="flex justify-end gap-3 mt-6">
      <Button variant="ghost" href="/expenses">{t('common.cancel')}</Button>
      <Button type="submit" loading={saving}>{t('expenses.save')}</Button>
    </div>
  </form>
{/if}
