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

  let dialogEl: HTMLDivElement | undefined = $state();

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onclose();
      return;
    }
    // Focus trap: cycle focus within modal
    if (e.key === 'Tab' && dialogEl) {
      const focusable = dialogEl.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  $effect(() => {
    if (open && dialogEl) {
      // Focus first focusable element when modal opens
      const focusable = dialogEl.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }
  });
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    onclick={handleBackdrop}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? 'modal-title' : undefined}
  >
    <div bind:this={dialogEl} class="bg-white dark:bg-gray-100 rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {#if title}
        <div class="px-6 pt-6 pb-0">
          <h2 id="modal-title" class="text-lg font-semibold text-gray-900">{title}</h2>
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
