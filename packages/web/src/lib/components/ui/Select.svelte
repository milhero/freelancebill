<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLSelectAttributes } from 'svelte/elements';

  interface Props extends HTMLSelectAttributes {
    label?: string;
    error?: string;
    value?: any;
    children: Snippet;
  }

  let {
    label,
    error,
    children,
    class: className = '',
    id,
    value = $bindable(''),
    ...rest
  }: Props = $props();

  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
</script>

<div class="space-y-1.5">
  {#if label}
    <label for={selectId} class="block text-sm font-medium text-gray-700">{label}</label>
  {/if}
  <select
    id={selectId}
    class="block w-full rounded-lg border border-gray-200 bg-white dark:bg-gray-100 dark:border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 {error ? 'border-danger-500' : ''} {className}"
    bind:value
    {...rest}
  >
    {@render children()}
  </select>
  {#if error}
    <p class="text-sm text-danger-600">{error}</p>
  {/if}
</div>
