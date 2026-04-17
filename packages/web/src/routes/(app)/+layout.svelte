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
    <div class="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-4 py-2 flex items-center justify-between text-sm">
      <span class="text-amber-800 dark:text-amber-200">
        {t('settings.backupReminder')}
        <a href="/settings" class="underline font-medium">{t('settings.backupNow')}</a>
      </span>
      <button onclick={dismissBackupReminder} class="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 ml-4">
        ✕
      </button>
    </div>
  {/if}
  <AppShell>
    {#snippet children()}
      {@render children()}
    {/snippet}
  </AppShell>
{/if}
