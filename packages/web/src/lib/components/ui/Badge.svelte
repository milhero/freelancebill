<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'gray' | 'green' | 'yellow' | 'red' | 'blue';
    children: Snippet;
    onclick?: () => void;
  }

  let { variant = 'gray', children, onclick }: Props = $props();

  const classes: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-success-50 text-success-700',
    yellow: 'bg-warning-50 text-warning-700',
    red: 'bg-danger-50 text-danger-700',
    blue: 'bg-accent-50 text-accent-700',
  };
</script>

{#if onclick}
  <button
    type="button"
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer {classes[variant]}"
    {onclick}
  >
    {@render children()}
  </button>
{:else}
  <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {classes[variant]}">
    {@render children()}
  </span>
{/if}
