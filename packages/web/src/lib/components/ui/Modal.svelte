<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    title?: string;
    onclose: () => void;
    children: Snippet;
    actions?: Snippet;
  }

  let { open, title, onclose, children, actions }: Props = $props();

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    onclick={handleBackdrop}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
  >
    <div class="bg-white dark:bg-gray-100 rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {#if title}
        <div class="px-6 pt-6 pb-0">
          <h2 class="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
      {/if}
      <div class="px-6 py-5">
        {@render children()}
      </div>
      {#if actions}
        <div class="flex justify-end gap-3 px-6 pb-6">
          {@render actions()}
        </div>
      {/if}
    </div>
  </div>
{/if}
