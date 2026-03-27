<script lang="ts">
  import { onMount } from 'svelte';

  let { formData = $bindable() }: { formData: Record<string, any> } = $props();

  let canvasEl: HTMLCanvasElement;
  let containerEl: HTMLDivElement;
  let wrapperEl: HTMLDivElement;
  let loading = $state(false);
  let hasContent = $state(false);
  let hasScrolled = $state(false);
  let containerWidth = $state(0);
  let ready = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout>;
  let pdfjsLib: any = null;

  onMount(() => {
    let observer: ResizeObserver | undefined;

    // Measure container
    if (containerEl) {
      containerWidth = containerEl.clientWidth;
      observer = new ResizeObserver((entries) => {
        containerWidth = entries[0].contentRect.width;
      });
      observer.observe(containerEl);
    }

    // Load pdf.js
    import('pdfjs-dist').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      pdfjsLib = pdfjs;
      ready = true;
    });

    // Cleanup on unmount
    return () => {
      observer?.disconnect();
      clearTimeout(debounceTimer);
    };
  });

  // Re-render when formData changes AND pdf.js is ready
  $effect(() => {
    if (!ready) return;
    const _data = JSON.stringify(formData);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => generatePreview(), 500);
  });

  async function generatePreview() {
    if (!pdfjsLib || !canvasEl || !containerWidth) return;
    if (!formData.senderName && !formData.clientName) return;

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

      const baseViewport = page.getViewport({ scale: 1 });
      const displayWidth = containerWidth - 2; // account for border
      const scale = (displayWidth / baseViewport.width) * 2; // 2x for retina
      const viewport = page.getViewport({ scale });

      canvasEl.width = viewport.width;
      canvasEl.height = viewport.height;
      canvasEl.style.width = `${displayWidth}px`;
      canvasEl.style.height = `${viewport.height / 2}px`;

      const ctx = canvasEl.getContext('2d')!;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, viewport.width, viewport.height);

      await page.render({ canvasContext: ctx, viewport }).promise;
      hasContent = true;
    } catch (e) {
      console.error('Preview error:', e);
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
    class="rounded-xl border border-gray-200 overflow-hidden overflow-y-auto bg-white"
    style="max-height: {Math.round(containerWidth * 1.5)}px;"
    onscroll={handleScroll}
  >
    <!-- Canvas always in DOM, hidden until content -->
    <canvas
      bind:this={canvasEl}
      class="block w-full"
      class:hidden={!hasContent}
    ></canvas>

    {#if loading && !hasContent}
      <div class="flex items-center justify-center bg-white" style="height: {Math.round(containerWidth * 1.4142)}px;">
        <div class="w-4 h-4 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    {:else if !hasContent}
      <div class="flex flex-col items-center justify-center text-gray-300 gap-2 bg-white" style="height: {Math.round(containerWidth * 1.4142)}px;">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        <span class="text-xs">Formular ausfüllen für Vorschau</span>
      </div>
    {/if}

    {#if loading && hasContent}
      <div class="absolute top-0 left-0 right-0 h-0.5 z-10">
        <div class="h-full w-1/3 bg-indigo-500 animate-pulse rounded-r"></div>
      </div>
    {/if}
  </div>

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
