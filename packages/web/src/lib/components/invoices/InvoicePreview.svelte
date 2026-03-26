<script lang="ts">
  import { onMount } from 'svelte';

  let { formData = $bindable() }: { formData: Record<string, any> } = $props();

  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let containerEl = $state<HTMLDivElement | null>(null);
  let wrapperEl = $state<HTMLDivElement | null>(null);
  let loading = $state(false);
  let hasContent = $state(false);
  let hasScrolled = $state(false);
  let containerWidth = $state(0);
  let debounceTimer: ReturnType<typeof setTimeout>;
  let pdfjsLib: any = null;

  onMount(async () => {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
    pdfjsLib = pdfjs;
  });

  $effect(() => {
    if (!containerEl) return;
    const observer = new ResizeObserver((entries) => {
      containerWidth = entries[0].contentRect.width;
    });
    observer.observe(containerEl);
    return () => observer.disconnect();
  });

  $effect(() => {
    const _data = JSON.stringify(formData);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => generatePreview(), 1000);
  });

  async function generatePreview() {
    if (!formData.senderName && !formData.clientName) return;
    if (!pdfjsLib || !canvasEl) return;
    loading = true;
    try {
      const res = await fetch('/api/invoices/preview-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (!res.ok) return;

      const buffer = await res.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const page = await pdf.getPage(1);

      // Scale to fit container width with 2x for retina
      const viewport = page.getViewport({ scale: 1 });
      const scale = (containerWidth / viewport.width) * 2;
      const scaledViewport = page.getViewport({ scale });

      canvasEl.width = scaledViewport.width;
      canvasEl.height = scaledViewport.height;
      canvasEl.style.width = `${scaledViewport.width / 2}px`;
      canvasEl.style.height = `${scaledViewport.height / 2}px`;

      const ctx = canvasEl.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
      hasContent = true;
    } catch (e) {
      // silent
    } finally {
      loading = false;
    }
  }

  function handleScroll() {
    if (wrapperEl) hasScrolled = wrapperEl.scrollTop > 20;
  }

  function resetScroll() {
    wrapperEl?.scrollTo({ top: 0, behavior: 'smooth' });
    hasScrolled = false;
  }
</script>

<div class="relative" bind:this={containerEl}>
  <div
    bind:this={wrapperEl}
    class="rounded-xl border border-gray-200 dark:border-gray-200 overflow-hidden overflow-y-auto bg-white dark:bg-gray-100"
    style="max-height: {Math.round(containerWidth * 1.5)}px;"
    onscroll={handleScroll}
  >
    {#if loading && !hasContent}
      <div class="flex items-center justify-center bg-white" style="height: {Math.round(containerWidth * 1.4142)}px;">
        <div class="w-4 h-4 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    {:else if hasContent}
      <canvas bind:this={canvasEl} class="block w-full"></canvas>
    {:else}
      <div class="flex flex-col items-center justify-center text-gray-300 gap-2 bg-white" style="height: {Math.round(containerWidth * 1.4142)}px;">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        <span class="text-xs">Formular ausfüllen für Vorschau</span>
      </div>
    {/if}

    <!-- Hidden canvas for when not yet visible -->
    {#if !hasContent}
      <canvas bind:this={canvasEl} class="hidden"></canvas>
    {/if}

    {#if loading && hasContent}
      <div class="absolute top-0 left-0 right-0 h-0.5 z-10">
        <div class="h-full w-1/3 bg-indigo-500 animate-pulse rounded-r"></div>
      </div>
    {/if}
  </div>

  <!-- Scroll reset pill -->
  {#if hasScrolled && hasContent}
    <button
      onclick={resetScroll}
      class="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium shadow-lg hover:bg-black/80 transition-all duration-200"
      style="animation: fadeUp 0.2s ease-out;"
    >
      <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
      Nach oben
    </button>
  {/if}
</div>

<style>
  @keyframes fadeUp {
    from { opacity: 0; transform: translate(-50%, 6px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }
</style>
