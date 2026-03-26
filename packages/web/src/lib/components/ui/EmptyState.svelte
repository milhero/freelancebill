<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
  }

  let { title, description, actions }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center py-16 text-center">
  <div class="rounded-full bg-gray-100 p-4 mb-4">
    <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  </div>
  <h3 class="text-base font-semibold text-gray-900">{title}</h3>
  {#if description}
    <p class="mt-1 text-sm text-gray-500 max-w-sm">{description}</p>
  {/if}
  {#if actions}
    <div class="mt-6">
      {@render actions()}
    </div>
  {/if}
</div>
