<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends HTMLInputAttributes {
    label?: string;
    error?: string;
    value?: any;
  }

  let {
    label,
    error,
    class: className = '',
    id,
    value = $bindable(),
    ...rest
  }: Props = $props();

  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
</script>

<div class="space-y-1.5">
  {#if label}
    <label for={inputId} class="block text-sm font-medium text-gray-700">{label}</label>
  {/if}
  <input
    id={inputId}
    class="block w-full rounded-lg border border-gray-200 bg-white dark:bg-gray-100 dark:border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 {error ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20' : ''} {className}"
    bind:value
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={error ? `${inputId}-error` : undefined}
    {...rest}
  />
  {#if error}
    <p id="{inputId}-error" class="text-sm text-danger-600">{error}</p>
  {/if}
</div>
