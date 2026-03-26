<script lang="ts">
  import { t } from '$lib/i18n/index.svelte.js';

  let { formData = $bindable() }: { formData: Record<string, any> } = $props();

  let pdfUrl = $state<string | null>(null);
  let loading = $state(false);
  let zoom = $state(80);
  let showZoom = $state(false);
  let zoomTimeout: ReturnType<typeof setTimeout>;
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

  function handleWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      zoom = Math.min(Math.max(zoom + (e.deltaY > 0 ? -5 : 5), 30), 200);
      flashZoom();
    }
  }

  function flashZoom() {
    showZoom = true;
    clearTimeout(zoomTimeout);
    zoomTimeout = setTimeout(() => showZoom = false, 1200);
  }

  function zoomIn() { zoom = Math.min(zoom + 10, 200); flashZoom(); }
  function zoomOut() { zoom = Math.max(zoom - 10, 30); flashZoom(); }
  function zoomReset() { zoom = 80; flashZoom(); }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="group relative flex flex-col h-full min-h-[700px] rounded-2xl bg-gray-50 dark:bg-gray-100 overflow-hidden transition-colors"
  onwheel={handleWheel}
>
  {#if pdfUrl}
    <!-- Loading indicator — subtle top bar -->
    {#if loading}
      <div class="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500/40 z-10">
        <div class="h-full w-1/3 bg-indigo-500 animate-pulse rounded-r"></div>
      </div>
    {/if}

    <!-- PDF container -->
    <div class="flex-1 overflow-auto flex justify-center items-start p-6 pt-8">
      <div
        class="relative bg-white rounded-sm transition-all duration-300 ease-out"
        style="width: {zoom * 4.2}px; aspect-ratio: 210 / 297; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08);"
      >
        <iframe
          src="{pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH"
          class="w-full h-full border-0 rounded-sm"
          title="Invoice Preview"
        ></iframe>
      </div>
    </div>

    <!-- Zoom controls — floating, only visible on hover -->
    <div
      class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-full bg-white/90 dark:bg-gray-100/90 backdrop-blur-sm border border-gray-200/60 shadow-sm transition-all duration-300"
      class:opacity-0={!showZoom}
      class:opacity-100={showZoom}
      class:group-hover:opacity-100={true}
      class:pointer-events-none={!showZoom}
      class:group-hover:pointer-events-auto={true}
    >
      <button
        onclick={zoomOut}
        class="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xs"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14"/></svg>
      </button>
      <button
        onclick={zoomReset}
        class="text-[11px] text-gray-400 hover:text-gray-700 tabular-nums w-10 text-center transition-colors"
      >
        {zoom}%
      </button>
      <button
        onclick={zoomIn}
        class="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xs"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
      </button>
    </div>

  {:else if loading}
    <div class="flex items-center justify-center h-full">
      <div class="w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>
  {:else}
    <div class="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
      <svg class="w-12 h-12" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      <span class="text-sm">Formular ausfüllen für Vorschau</span>
    </div>
  {/if}
</div>
