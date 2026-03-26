<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
  }

  let { title, description, actions }: Props = $props();
</script>

<div class="flex items-center justify-between mb-8">
  <div>
    <h1 class="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
    {#if description}
      <p class="mt-1 text-sm text-gray-500">{description}</p>
    {/if}
  </div>
  {#if actions}
    <div class="flex items-center gap-3">
      {@render actions()}
    </div>
  {/if}
</div>
