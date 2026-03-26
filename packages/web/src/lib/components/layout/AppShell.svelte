<script lang="ts">
  import type { Snippet } from 'svelte';
  import Sidebar from './Sidebar.svelte';
  import TopBar from './TopBar.svelte';
  import Toast from '$lib/components/ui/Toast.svelte';

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();
  let sidebarOpen = $state(false);
</script>

<div class="flex h-screen bg-gray-50/50">
  <Sidebar open={sidebarOpen} onclose={() => (sidebarOpen = false)} />

  <div class="flex flex-1 flex-col min-w-0">
    <TopBar onMenuToggle={() => (sidebarOpen = !sidebarOpen)} />

    <main class="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8">
      {@render children()}
    </main>
  </div>
</div>

<Toast />
