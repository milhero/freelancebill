<script lang="ts">
  import { onMount } from 'svelte';
  import { getSettings, updateSettings } from '$lib/api/settings.js';
  import { fetchApi } from '$lib/api/client.js';
  import type { Settings, TaxMode } from '@freelancebill/shared';
  import { t, getLocale, setLocale } from '$lib/i18n/index.svelte.js';
  import { getTheme, setTheme } from '$lib/stores/theme.svelte.js';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { showToast } from '$lib/stores/toast.svelte.js';

  let settings = $state<Settings | null>(null);
  let saving = $state(false);

  // Password change state
  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let changingPassword = $state(false);
  let passwordError = $state('');
  let legalNotesOpen = $state(false);

  onMount(async () => {
    const res = await getSettings();
    settings = res.data;
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!settings) return;
    saving = true;
    try {
      const res = await updateSettings({
        fullName: settings.fullName,
        addressStreet: settings.addressStreet,
        addressZip: settings.addressZip,
        addressCity: settings.addressCity,
        email: settings.email,
        phone: settings.phone,
        iban: settings.iban,
        bic: settings.bic,
        bankName: settings.bankName,
        taxFreeAllowance: settings.taxFreeAllowance,
        defaultPaymentDays: settings.defaultPaymentDays,
        defaultHourlyRate: settings.defaultHourlyRate,
        taxMode: settings.taxMode,
        taxRate: settings.taxRate,
        taxId: settings.taxId,
        vatId: settings.vatId,
      });
      settings = res.data;
      showToast(t('common.success'), 'success');
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      saving = false;
    }
  }

  async function handlePasswordChange(e: Event) {
    e.preventDefault();
    passwordError = '';

    if (newPassword.length < 8) {
      passwordError = t('common.error');
      return;
    }

    if (newPassword !== confirmPassword) {
      passwordError = t('common.error');
      return;
    }

    changingPassword = true;
    try {
      await fetchApi('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      showToast(t('common.success'), 'success');
      currentPassword = '';
      newPassword = '';
      confirmPassword = '';
    } catch (err: any) {
      showToast(err.message || t('common.error'), 'error');
    } finally {
      changingPassword = false;
    }
  }

  // Backup state
  let downloadingBackup = $state(false);
  let restoringBackup = $state(false);

  function handleLocaleChange(locale: 'de' | 'en') {
    setLocale(locale);
  }

  async function handleBackupDownload() {
    downloadingBackup = true;
    try {
      const backup = await fetchApi<any>('/api/backup');
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `freelancebill-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(t('common.success'), 'success');
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      downloadingBackup = false;
    }
  }

  async function handleBackupRestore() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      restoringBackup = true;
      try {
        const text = await file.text();
        const backup = JSON.parse(text);
        await fetchApi('/api/backup/restore', {
          method: 'POST',
          body: JSON.stringify(backup),
        });
        showToast(t('settings.backupSuccess'), 'success');
        // Reload settings after restore
        const res = await getSettings();
        settings = res.data;
      } catch {
        showToast(t('common.error'), 'error');
      } finally {
        restoringBackup = false;
      }
    };
    input.click();
  }
</script>

<PageHeader title={t('settings.title')} />

{#if settings}
  <form onsubmit={handleSubmit} class="max-w-2xl space-y-8">
    <Card>
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('settings.personalData')}</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2">
          <Input label={t('settings.fullName')} bind:value={settings.fullName} required />
        </div>
        <div class="sm:col-span-2">
          <Input label={t('settings.street')} bind:value={settings.addressStreet} required />
        </div>
        <Input label={t('settings.zip')} bind:value={settings.addressZip} required />
        <Input label={t('settings.city')} bind:value={settings.addressCity} required />
        <Input label={t('settings.email')} type="email" bind:value={settings.email} required />
        <Input label={t('settings.phone')} bind:value={settings.phone} />
      </div>
    </Card>

    <Card>
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('settings.bankName')}</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2">
          <Input label={t('settings.iban')} bind:value={settings.iban} />
        </div>
        <Input label={t('settings.bic')} bind:value={settings.bic} />
        <Input label={t('settings.bankName')} bind:value={settings.bankName} />
      </div>
    </Card>

    <!-- Tax Settings -->
    <Card>
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('settings.taxSettings')}</h2>

      <!-- Tax status badge -->
      {#if settings.taxMode === 'kleinunternehmer'}
        <div class="mb-4 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
          {t('settings.kleinunternehmerActive')} — §19 UStG
        </div>
      {:else}
        <div class="mb-4 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
          {t('settings.regelbesteuerungActive')} — {settings.taxRate}% USt
        </div>
      {/if}

      <!-- Tax Mode selector -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">{t('settings.taxMode')}</label>
        <div class="space-y-3">
          <label class="flex items-start gap-3 cursor-pointer p-3 rounded-lg border transition-colors {settings.taxMode === 'kleinunternehmer' ? 'border-accent-300 bg-accent-50' : 'border-gray-200 hover:border-gray-300'}">
            <input
              type="radio"
              name="taxMode"
              value="kleinunternehmer"
              checked={settings.taxMode === 'kleinunternehmer'}
              onchange={() => { settings!.taxMode = 'kleinunternehmer'; }}
              class="mt-0.5 h-4 w-4 border-gray-300 text-accent-600 focus:ring-accent-500"
            />
            <div>
              <span class="text-sm font-medium text-gray-900">{t('settings.kleinunternehmer')}</span>
              <p class="text-xs text-gray-500 mt-0.5">{t('settings.kleinunternehmerInfo')}</p>
            </div>
          </label>
          <label class="flex items-start gap-3 cursor-pointer p-3 rounded-lg border transition-colors {settings.taxMode === 'regelbesteuerung' ? 'border-accent-300 bg-accent-50' : 'border-gray-200 hover:border-gray-300'}">
            <input
              type="radio"
              name="taxMode"
              value="regelbesteuerung"
              checked={settings.taxMode === 'regelbesteuerung'}
              onchange={() => { settings!.taxMode = 'regelbesteuerung'; }}
              class="mt-0.5 h-4 w-4 border-gray-300 text-accent-600 focus:ring-accent-500"
            />
            <div>
              <span class="text-sm font-medium text-gray-900">{t('settings.regelbesteuerung')}</span>
              <p class="text-xs text-gray-500 mt-0.5">{t('settings.regelbesteuerungInfo')}</p>
            </div>
          </label>
        </div>
      </div>

      <!-- Tax rate (only visible for Regelbesteuerung) -->
      {#if settings.taxMode === 'regelbesteuerung'}
        <div class="mb-4">
          <Input label={t('settings.taxRate')} type="number" step="0.01" min="0" max="100" bind:value={settings.taxRate} />
          <p class="text-xs text-gray-500 mt-1">{t('settings.taxRateInfo')}</p>
        </div>
      {/if}

      <!-- Tax identification (always visible) -->
      <div class="mt-6 pt-4 border-t border-gray-100">
        <h3 class="text-sm font-medium text-gray-700 mb-3">{t('settings.taxIdentification')}</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={t('settings.taxId')} bind:value={settings.taxId} placeholder={t('settings.taxIdPlaceholder')} />
          <Input label={t('settings.vatId')} bind:value={settings.vatId} placeholder={t('settings.vatIdPlaceholder')} />
        </div>
        <p class="text-xs text-gray-500 mt-2">{t('settings.taxIdInfo')}</p>
      </div>
    </Card>

    <Card>
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('settings.defaults')}</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label={t('settings.taxFreeAllowance')} type="number" step="0.01" bind:value={settings.taxFreeAllowance} />
        <Input label={t('settings.defaultPaymentDays')} type="number" bind:value={settings.defaultPaymentDays} />
        <Input label={t('settings.defaultHourlyRate')} type="number" step="0.01" bind:value={settings.defaultHourlyRate} />
      </div>
    </Card>

    <!-- Language Selector -->
    <Card>
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('settings.language')}</h2>
      <div class="flex gap-2">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {getLocale() === 'de' ? 'bg-accent-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
          onclick={() => handleLocaleChange('de')}
        >
          {t('settings.german')}
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {getLocale() === 'en' ? 'bg-accent-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
          onclick={() => handleLocaleChange('en')}
        >
          {t('settings.english')}
        </button>
      </div>
    </Card>

    <!-- Theme Selector -->
    <Card>
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('settings.design')}</h2>
      <div class="flex gap-2">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {getTheme() === 'light' ? 'bg-accent-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
          onclick={() => setTheme('light')}
        >
          {t('settings.themeLight')}
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {getTheme() === 'dark' ? 'bg-accent-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
          onclick={() => setTheme('dark')}
        >
          {t('settings.themeDark')}
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {getTheme() === 'system' ? 'bg-accent-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
          onclick={() => setTheme('system')}
        >
          {t('settings.themeSystem')}
        </button>
      </div>
    </Card>

    <div class="flex justify-end">
      <Button type="submit" loading={saving}>{t('settings.save')}</Button>
    </div>
  </form>

  <form onsubmit={handlePasswordChange} class="max-w-2xl mt-8">
    <Card>
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('settings.changePassword')}</h2>
      <div class="grid grid-cols-1 gap-4">
        <Input label={t('settings.currentPassword')} type="password" bind:value={currentPassword} required />
        <Input label={t('settings.newPassword')} type="password" bind:value={newPassword} required />
        <Input label={t('settings.confirmPassword')} type="password" bind:value={confirmPassword} required />
        {#if passwordError}
          <p class="text-sm text-red-600">{passwordError}</p>
        {/if}
      </div>
      <div class="flex justify-end mt-4">
        <Button type="submit" loading={changingPassword}>{t('settings.changePassword')}</Button>
      </div>
    </Card>
  </form>

  <div class="max-w-2xl mt-8">
    <Card>
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('settings.backup')}</h2>
      <p class="text-sm text-amber-600 dark:text-amber-400 mb-4">{t('settings.backupWarning')}</p>
      <div class="flex gap-3">
        <Button onclick={handleBackupDownload} loading={downloadingBackup}>{t('settings.backupDownload')}</Button>
        <Button onclick={handleBackupRestore} loading={restoringBackup}>{t('settings.backupRestore')}</Button>
      </div>
    </Card>
  </div>

  <!-- Legal Notes (collapsible) -->
  <div class="max-w-2xl mt-8">
    <Card>
      <button
        type="button"
        class="w-full flex items-center justify-between text-left"
        onclick={() => (legalNotesOpen = !legalNotesOpen)}
      >
        <h2 class="text-base font-semibold text-gray-900">{t('settings.legalNotes')}</h2>
        <svg
          class="h-5 w-5 text-gray-400 transition-transform {legalNotesOpen ? 'rotate-180' : ''}"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {#if legalNotesOpen}
        <div class="mt-4 space-y-6">
          <!-- §19 UStG -->
          <div>
            <h3 class="text-sm font-semibold text-gray-800">{t('settings.legalKleinunternehmerTitle')}</h3>
            <p class="text-sm text-gray-600 mt-1">{t('settings.legalKleinunternehmerText')}</p>
          </div>

          <!-- §14 UStG -->
          <div>
            <h3 class="text-sm font-semibold text-gray-800">{t('settings.legalInvoiceTitle')}</h3>
            <ul class="mt-2 space-y-1">
              {#each t('settings.legalInvoiceItems').split(',') as item}
                <li class="flex items-start gap-2 text-sm text-gray-600">
                  <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {item.trim()}
                </li>
              {/each}
            </ul>
          </div>

          <!-- §14b UStG -->
          <div>
            <h3 class="text-sm font-semibold text-gray-800">{t('settings.legalRetentionTitle')}</h3>
            <p class="text-sm text-gray-600 mt-1">{t('settings.legalRetentionText')}</p>
          </div>
        </div>
      {/if}
    </Card>
  </div>
{/if}
