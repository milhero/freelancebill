<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    class?: string;
    padding?: boolean;
    children: Snippet;
  }

  let { class: className = '', padding = true, children }: Props = $props();
</script>

<div class="bg-white dark:bg-gray-100 rounded-xl border border-gray-100 dark:border-gray-200 shadow-sm {padding ? 'p-6' : ''} {className}">
  {@render children()}
</div>
