<script lang="ts">
  import { t } from '$lib/i18n/index.svelte.js';

  let { formData = $bindable() }: { formData: Record<string, any> } = $props();

  let pdfUrl = $state<string | null>(null);
  let loading = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout>;
  let containerEl = $state<HTMLDivElement | null>(null);
  let scrollEl = $state<HTMLDivElement | null>(null);
  let containerWidth = $state(0);

  // Smooth zoom via CSS transform
  let scale = $state(1);
  let isZoomed = $state(false);
  let showReset = $state(false);
  let resetTimeout: ReturnType<typeof setTimeout>;

  $effect(() => {
    if (!containerEl) return;
    const observer = new ResizeObserver((entries) => {
      containerWidth = entries[0].contentRect.width;
    });
    observer.observe(containerEl);
    return () => observer.disconnect();
  });

  let pdfHeight = $derived(Math.round(containerWidth * 1.4142));

  $effect(() => {
    const _data = JSON.stringify(formData);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => generatePreview(), 1000);
  });

  // Track if user has scrolled or zoomed
  $effect(() => {
    isZoomed = scale !== 1;
    if (isZoomed) {
      showReset = true;
      clearTimeout(resetTimeout);
      resetTimeout = setTimeout(() => { if (!isZoomed) showReset = false; }, 3000);
    }
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
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      scale = Math.min(Math.max(scale + delta, 0.5), 2.5);
      showReset = true;
    }
  }

  function resetView() {
    scale = 1;
    if (scrollEl) {
      scrollEl.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
    setTimeout(() => showReset = false, 400);
  }

  function handleScroll() {
    if (scrollEl && scrollEl.scrollTop > 20) {
      showReset = true;
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={containerEl}
  class="relative bg-white rounded-xl border border-gray-200 dark:bg-gray-100 dark:border-gray-200 overflow-hidden"
  onwheel={handleWheel}
>
  {#if pdfUrl}
    {#if loading}
      <div class="absolute top-0 left-0 right-0 h-0.5 z-10">
        <div class="h-full w-1/3 bg-indigo-500 animate-pulse rounded-r"></div>
      </div>
    {/if}

    <div
      bind:this={scrollEl}
      class="overflow-auto"
      style="height: {pdfHeight}px;"
      onscroll={handleScroll}
    >
      <div
        class="origin-top-left transition-transform duration-200 ease-out"
        style="transform: scale({scale}); width: {100 / scale}%; height: {100 / scale}%;"
      >
        <div class="relative overflow-hidden w-full" style="height: {pdfHeight}px;">
          <iframe
            src="{pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitW"
            class="absolute border-0 block"
            style="top: -4px; left: -4px; width: calc(100% + 8px); height: calc(100% + 8px); background: white;"
            title="Invoice Preview"
          ></iframe>
        </div>
      </div>
    </div>

    <!-- Floating reset pill — only visible when zoomed or scrolled -->
    {#if showReset}
      <button
        onclick={resetView}
        class="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full bg-gray-900/70 dark:bg-gray-800/80 backdrop-blur-sm text-white text-[11px] font-medium shadow-lg hover:bg-gray-900/90 transition-all duration-300 animate-fade-in"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"/>
        </svg>
        {Math.round(scale * 100)}%
      </button>
    {/if}

  {:else if loading}
    <div class="flex items-center justify-center" style="height: {pdfHeight || 700}px;">
      <div class="w-4 h-4 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>
  {:else}
    <div class="flex flex-col items-center justify-center text-gray-300 gap-2" style="height: {pdfHeight || 700}px;">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      <span class="text-xs">Formular ausfüllen für Vorschau</span>
    </div>
  {/if}
</div>

<style>
  @keyframes fade-in {
    from { opacity: 0; transform: translate(-50%, 8px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }
  .animate-fade-in {
    animation: fade-in 0.25s ease-out;
  }
</style>
