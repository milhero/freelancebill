<script lang="ts">
  import { getToasts, dismissToast } from '$lib/stores/toast.svelte.js';

  const toasts = getToasts();

  const typeClasses: Record<string, string> = {
    success: 'bg-success-50 text-success-700 border-success-200',
    error: 'bg-danger-50 text-danger-700 border-danger-200',
    info: 'bg-accent-50 text-accent-700 border-accent-200',
  };
</script>

{#if toasts.items.length > 0}
  <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
    {#each toasts.items as toast (toast.id)}
      <div class="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg {typeClasses[toast.type]}">
        <span>{toast.message}</span>
        <button
          type="button"
          class="ml-2 opacity-60 hover:opacity-100 transition-opacity"
          onclick={() => dismissToast(toast.id)}
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    {/each}
  </div>
{/if}
