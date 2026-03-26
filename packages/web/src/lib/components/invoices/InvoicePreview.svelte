<script lang="ts">
  import { t } from '$lib/i18n/index.svelte.js';

  let { formData = $bindable() }: { formData: Record<string, any> } = $props();

  let pdfUrl = $state<string | null>(null);
  let loading = $state(false);
  let zoom = $state(100);
  let debounceTimer: ReturnType<typeof setTimeout>;

  // Debounced preview generation
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
      // silent fail for preview
    } finally {
      loading = false;
    }
  }

  function zoomIn() { zoom = Math.min(zoom + 20, 200); }
  function zoomOut() { zoom = Math.max(zoom - 20, 40); }
</script>

<div class="relative flex flex-col h-full min-h-[600px] rounded-xl border border-gray-200 bg-gray-100 dark:bg-gray-200 overflow-hidden">
  {#if pdfUrl}
    <!-- Zoom controls -->
    <div class="flex items-center justify-between px-3 py-1.5 bg-white dark:bg-gray-100 border-b border-gray-200 shrink-0">
      <span class="text-xs text-gray-500">Vorschau</span>
      <div class="flex items-center gap-1">
        <button onclick={zoomOut} class="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 text-sm font-medium" title="Verkleinern">−</button>
        <span class="text-xs text-gray-500 w-10 text-center">{zoom}%</span>
        <button onclick={zoomIn} class="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 text-sm font-medium" title="Vergrößern">+</button>
      </div>
      {#if loading}
        <div class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
      {:else}
        <div class="w-2"></div>
      {/if}
    </div>
    <!-- PDF display -->
    <div class="flex-1 overflow-auto flex justify-center p-4">
      <div style="width: {zoom}%; max-width: {zoom * 5}px; aspect-ratio: 210 / 297;" class="shadow-lg bg-white shrink-0">
        <iframe
          src="{pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH"
          class="w-full h-full border-0"
          title="Invoice Preview"
        ></iframe>
      </div>
    </div>
  {:else if loading}
    <div class="flex items-center justify-center h-full text-gray-400">
      <span class="animate-pulse">{t('common.loading')}</span>
    </div>
  {:else}
    <div class="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2">
      <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      <span>Formular ausfüllen für Vorschau</span>
    </div>
  {/if}
</div>
