<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { checkAuth, getAuth } from '$lib/stores/auth.svelte.js';
  import AppShell from '$lib/components/layout/AppShell.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';

  let { children }: { children: Snippet } = $props();
  const auth = getAuth();

  onMount(async () => {
    await checkAuth();
    if (!auth.authenticated) {
      goto('/login');
    }
  });
</script>

{#if auth.loading}
  <div class="flex items-center justify-center min-h-screen">
    <LoadingSpinner size="lg" />
  </div>
{:else if auth.authenticated}
  <AppShell>
    {#snippet children()}
      {@render children()}
    {/snippet}
  </AppShell>
{/if}
