<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { createExpense } from '$lib/api/expenses.js';
  import { getTags } from '$lib/api/tags.js';
  import type { Tag } from '@freelancebill/shared';
  import { t } from '$lib/i18n/index.svelte.js';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { showToast } from '$lib/stores/toast.svelte.js';

  let tags = $state<Tag[]>([]);
  let selectedTagIds = $state<string[]>([]);
  let date = $state(new Date().toISOString().split('T')[0]);
  let description = $state('');
  let amount = $state<number | undefined>(undefined);
  let paymentMethod = $state('');
  let notes = $state('');
  let saving = $state(false);

  onMount(async () => {
    const res = await getTags();
    tags = res.data;
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
    if (amount === undefined) return;
    saving = true;
    try {
      await createExpense({
        date,
        description,
        amount,
        paymentMethod: paymentMethod || undefined,
        notes: notes || undefined,
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

<PageHeader title={t('expenses.new')} />

<form onsubmit={handleSubmit} class="max-w-2xl">
  <Card>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Input label={t('expenses.date')} type="date" bind:value={date} required />
      <div class="sm:col-span-2">
        <Input label={t('expenses.description')} bind:value={description} required />
      </div>
      <Input label={t('expenses.amount')} type="number" step="0.01" bind:value={amount} required />
      <Input label={t('expenses.paymentMethod')} bind:value={paymentMethod} />

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
        <Textarea label={t('expenses.notes')} bind:value={notes} />
      </div>
    </div>
  </Card>

  <div class="flex justify-end gap-3 mt-6">
    <Button variant="ghost" href="/expenses">{t('common.cancel')}</Button>
    <Button type="submit" loading={saving}>{t('expenses.create')}</Button>
  </div>
</form>
