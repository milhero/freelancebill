<script lang="ts">
  import { t } from '$lib/i18n/index.svelte.js';

  let { formData = $bindable() }: { formData: Record<string, any> } = $props();

  let pdfUrl = $state<string | null>(null);
  let loading = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout>;

  $effect(() => {
    const _data = JSON.stringify(formData);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => generatePreview(), 1000);
  });

  async function generatePreview() {
    if (!formData.senderName && !formData.clientName) return;
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
      // silent
    } finally {
      loading = false;
    }
  }
</script>

<div class="relative flex flex-col h-full min-h-[700px] bg-white rounded-xl border border-gray-200 dark:bg-gray-100 dark:border-gray-200 overflow-hidden">
  {#if pdfUrl}
    {#if loading}
      <div class="absolute top-0 left-0 right-0 h-0.5 z-10">
        <div class="h-full w-1/3 bg-indigo-500 animate-pulse rounded-r"></div>
      </div>
    {/if}

    <iframe
      src="{pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH"
      class="w-full h-full border-0"
      style="background: white;"
      title="Invoice Preview"
    ></iframe>

  {:else if loading}
    <div class="flex items-center justify-center h-full">
      <div class="w-4 h-4 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>
  {:else}
    <div class="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      <span class="text-xs">Formular ausfüllen für Vorschau</span>
    </div>
  {/if}
</div>
