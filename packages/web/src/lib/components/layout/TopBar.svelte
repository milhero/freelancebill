<script lang="ts">
  import { performLogout } from '$lib/stores/auth.svelte.js';
  import { t } from '$lib/i18n/index.svelte.js';

  interface Props {
    onMenuToggle: () => void;
  }

  let { onMenuToggle }: Props = $props();
</script>

<header class="sticky top-0 z-30 flex items-center h-16 bg-white/80 dark:bg-gray-50/80 backdrop-blur-lg border-b border-gray-100 px-4 lg:px-8">
  <!-- Mobile menu button -->
  <button
    type="button"
    class="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
    onclick={onMenuToggle}
  >
    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </button>

  <div class="flex-1"></div>

  <!-- Logout -->
  <button
    type="button"
    class="text-sm text-gray-500 hover:text-gray-700 transition-colors"
    onclick={performLogout}
  >
    {t('nav.logout')}
  </button>
</header>
