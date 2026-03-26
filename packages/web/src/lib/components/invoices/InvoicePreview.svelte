<script lang="ts">
  import { t } from '$lib/i18n/index.svelte.js';

  let { formData = $bindable() }: { formData: Record<string, any> } = $props();

  let pdfUrl = $state<string | null>(null);
  let loading = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout>;

  // Debounced preview generation
  $effect(() => {
    // Access formData to track it
    const _data = JSON.stringify(formData);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => generatePreview(), 1000);
  });

  async function generatePreview() {
    if (!formData.invoiceNumber || !formData.clientName) return;
    loading = true;
    try {
      const res = await fetch('/api/invoices/preview-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const blob = await res.blob();
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        pdfUrl = URL.createObjectURL(blob);
      }
    } catch (e) {
      // silent fail for preview
    } finally {
      loading = false;
    }
  }
</script>

<div class="relative h-full min-h-[600px] rounded-xl border border-gray-200 bg-white dark:bg-gray-100 overflow-hidden">
  {#if loading && !pdfUrl}
    <div class="flex items-center justify-center h-full text-gray-400">
      <span class="animate-pulse">{t('common.loading')}</span>
    </div>
  {:else if pdfUrl}
    <iframe src={pdfUrl} class="w-full h-full" title="Invoice Preview"></iframe>
    {#if loading}
      <div class="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
    {/if}
  {:else}
    <div class="flex items-center justify-center h-full text-gray-400 text-sm">
      {t('invoices.previewPdf')}...
    </div>
  {/if}
</div>
