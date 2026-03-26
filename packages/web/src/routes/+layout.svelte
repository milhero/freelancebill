<script lang="ts">
  import '../app.css';
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { initLocale } from '$lib/i18n/index.svelte.js';
  import { initTheme } from '$lib/stores/theme.svelte.js';

  let { children }: { children: Snippet } = $props();

  onMount(() => {
    initLocale();
    initTheme();
  });
</script>

{@render children()}
