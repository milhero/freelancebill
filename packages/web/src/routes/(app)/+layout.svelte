<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { checkAuth, getAuth } from '$lib/stores/auth.svelte.js';
  import { t } from '$lib/i18n/index.svelte.js';
  import AppShell from '$lib/components/layout/AppShell.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';

  let { children }: { children: Snippet } = $props();
  const auth = getAuth();
  let showBackupReminder = $state(false);

  onMount(async () => {
    await checkAuth();
    if (!auth.authenticated) {
      goto('/login');
    }

    // Check if last backup was more than 30 days ago
    const lastBackup = localStorage.getItem('freelancebill-last-backup');
    const dismissed = localStorage.getItem('freelancebill-backup-dismissed');
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Show reminder if never backed up or backup older than 30 days,
    // and not dismissed within the last 7 days
    if ((!lastBackup || parseInt(lastBackup) < thirtyDaysAgo) &&
        (!dismissed || parseInt(dismissed) < sevenDaysAgo)) {
      showBackupReminder = true;
    }
  });

  function dismissBackupReminder() {
    showBackupReminder = false;
    localStorage.setItem('freelancebill-backup-dismissed', Date.now().toString());
  }
</script>

{#if auth.loading}
  <div class="flex items-center justify-center min-h-screen">
    <LoadingSpinner size="lg" />
  </div>
{:else if auth.authenticated}
  {#if showBackupReminder}
    <div class="fixed top-4 right-4 z-50 w-80 animate-slide-in">
      <div class="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 p-4">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
            <svg class="w-5 h-5 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings.backupReminder')}</p>
            <a href="/settings" onclick={dismissBackupReminder} class="mt-1.5 inline-block text-xs font-medium text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300">
              {t('settings.backupNow')} →
            </a>
          </div>
          <button onclick={dismissBackupReminder} class="flex-shrink-0 text-gray-300 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  {/if}
  <AppShell>
    {#snippet children()}
      {@render children()}
    {/snippet}
  </AppShell>
{/if}
