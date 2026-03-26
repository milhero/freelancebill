<script lang="ts">
  import { onMount } from 'svelte';
  import { getDocuments, uploadDocument, deleteDocument, getDocumentFileUrl, type Document } from '$lib/api/documents.js';
  import { t } from '$lib/i18n/index.svelte.js';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
  import { showToast } from '$lib/stores/toast.svelte.js';

  let documents = $state<Document[]>([]);
  let typeFilter = $state('all');
  let yearFilter = $state('');
  let deleteTarget = $state<Document | null>(null);
  let fileInput: HTMLInputElement;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  onMount(async () => {
    await loadDocuments();
  });

  async function loadDocuments() {
    try {
      const res = await getDocuments(
        typeFilter !== 'all' ? typeFilter : undefined,
        yearFilter || undefined,
      );
      documents = res.data;
    } catch {
      showToast(t('common.error'), 'error');
    }
  }

  function onFilterChange() {
    loadDocuments();
  }

  function triggerUpload() {
    fileInput?.click();
  }

  async function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      await uploadDocument(file, file.name, 'other');
      showToast(t('common.success'), 'success');
      await loadDocuments();
    } catch {
      showToast(t('common.error'), 'error');
    }

    // Reset input
    input.value = '';
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDocument(deleteTarget.id);
      showToast(t('common.delete'), 'success');
      deleteTarget = null;
      await loadDocuments();
    } catch {
      showToast(t('common.error'), 'error');
    }
  }

  function formatFileSize(bytes: number | null): string {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
  }

  function getTypeBadge(type: string): { label: string; variant: 'blue' | 'green' | 'gray' } {
    switch (type) {
      case 'invoice_sent':
        return { label: t('documents.invoiceSent'), variant: 'blue' };
      case 'invoice_received':
        return { label: t('documents.invoiceReceived'), variant: 'green' };
      default:
        return { label: t('documents.other'), variant: 'gray' };
    }
  }
</script>

<input
  type="file"
  accept=".pdf,.jpg,.jpeg,.png,.webp"
  class="hidden"
  bind:this={fileInput}
  onchange={handleFileSelect}
/>

<PageHeader title={t('documents.title')}>
  {#snippet actions()}
    <Button onclick={triggerUpload}>{t('documents.upload')}</Button>
  {/snippet}
</PageHeader>

<!-- Filters -->
<div class="mb-6 flex gap-3 max-w-md">
  <Select label={t('documents.type')} bind:value={typeFilter} onchange={onFilterChange}>
    {#snippet children()}
      <option value="all">{t('documents.all')}</option>
      <option value="invoice_sent">{t('documents.invoiceSent')}</option>
      <option value="invoice_received">{t('documents.invoiceReceived')}</option>
      <option value="other">{t('documents.other')}</option>
    {/snippet}
  </Select>
  <Select label={t('documents.date')} bind:value={yearFilter} onchange={onFilterChange}>
    {#snippet children()}
      <option value="">{t('documents.all')}</option>
      {#each years as year}
        <option value={year}>{year}</option>
      {/each}
    {/snippet}
  </Select>
</div>

{#if documents.length === 0}
  <EmptyState title={t('common.noData')} description={t('documents.upload')}>
    {#snippet actions()}
      <Button onclick={triggerUpload}>{t('documents.upload')}</Button>
    {/snippet}
  </EmptyState>
{:else}
  <Card>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100">
            <th class="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('documents.name')}</th>
            <th class="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('documents.type')}</th>
            <th class="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('documents.date')}</th>
            <th class="text-right py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('documents.size')}</th>
            <th class="py-3 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {#each documents as doc (doc.id)}
            {@const badge = getTypeBadge(doc.type)}
            <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
              <td class="py-3 px-3">
                <a
                  href={getDocumentFileUrl(doc.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="font-medium text-gray-900 hover:text-accent-600 transition-colors"
                >
                  {doc.name}
                </a>
                {#if doc.invoiceId}
                  <span class="ml-2 text-[10px] text-gray-400">{t('documents.autoArchived')}</span>
                {/if}
              </td>
              <td class="py-3 px-3">
                <Badge variant={badge.variant}>
                  {#snippet children()}{badge.label}{/snippet}
                </Badge>
              </td>
              <td class="py-3 px-3 text-gray-500">{formatDate(doc.uploadedAt)}</td>
              <td class="py-3 px-3 text-right text-gray-500">{formatFileSize(doc.fileSize)}</td>
              <td class="py-3 px-3">
                <div class="flex items-center gap-2 justify-end">
                  <!-- Download -->
                  <a
                    href={getDocumentFileUrl(doc.id)}
                    download={doc.name}
                    class="text-gray-400 hover:text-accent-600 transition-colors"
                    title="Download"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                  <!-- Delete -->
                  <button
                    type="button"
                    class="text-gray-300 hover:text-danger-500 transition-colors"
                    onclick={() => (deleteTarget = doc)}
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
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
  open={deleteTarget !== null}
  title={t('common.delete')}
  message={t('documents.confirmDelete')}
  onconfirm={handleDelete}
  oncancel={() => (deleteTarget = null)}
/>
