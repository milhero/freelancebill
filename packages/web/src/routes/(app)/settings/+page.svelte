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
  let settingsTab = $state<'profile' | 'tax' | 'invoice' | 'defaults' | 'appearance' | 'security'>('profile');

  const templates = [
    { key: 'standard', name: 'Standard', desc: 'Minimales Design mit dunklem Header' },
    { key: 'modern-minimal', name: 'Modern Minimal', desc: 'Viel Weissraum, perfekt fuer Kreative' },
    { key: 'serios-klassisch', name: 'Serios Klassisch', desc: 'Traditionelles Geschaeftsbriefformat' },
    { key: 'freelancer-kompakt', name: 'Freelancer Kompakt', desc: 'Kompakt, alles auf einen Blick' },
    { key: 'agentur', name: 'Agentur', desc: 'Zweispaltig mit Akzentleiste' },
    { key: 'handwerk', name: 'Handwerk', desc: 'Positionsnummern, Material & Arbeit' },
    { key: 'beratung', name: 'Beratung', desc: 'Stundenbasiert mit Datumsansicht' },
    { key: 'dienstleistung', name: 'Dienstleistung', desc: 'Klare Tabellenstruktur fuer Services' },
  ];

  const colorPalette = [
    '#1a1a2e', '#2563eb', '#7c3aed', '#059669', '#dc2626',
    '#d97706', '#0891b2', '#475569', '#000000', '#374151',
  ];

  onMount(async () => {
    const res = await getSettings();
    // Normalize null values to empty strings for bind:value compatibility
    const s = res.data;
    s.phone = s.phone ?? '';
    s.iban = s.iban ?? '';
    s.bic = s.bic ?? '';
    s.bankName = s.bankName ?? '';
    s.taxId = s.taxId ?? '';
    s.vatId = s.vatId ?? '';
    s.taxMode = s.taxMode ?? 'kleinunternehmer';
    s.taxRate = s.taxRate ?? 19;
    s.invoiceTemplate = s.invoiceTemplate ?? 'standard';
    s.invoiceAccentColor = s.invoiceAccentColor ?? '#1a1a2e';
    settings = s;
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
        invoiceTemplate: settings.invoiceTemplate,
        invoiceAccentColor: settings.invoiceAccentColor,
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
      const response = await fetch('/api/backup', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Backup download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `freelancebill-backup-${date}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      localStorage.setItem('freelancebill-last-backup', Date.now().toString());
      showToast(t('settings.backupSuccess'), 'success');
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      downloadingBackup = false;
    }
  }

  async function handleBackupRestore() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      restoringBackup = true;
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/api/backup/restore', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        if (!response.ok) throw new Error('Restore failed');
        showToast(t('settings.backupSuccess'), 'success');
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
  <!-- Settings Tabs -->
  <div class="mb-6 flex gap-2 flex-wrap">
    {#each [
      { key: 'profile', label: 'Profil & Bank' },
      { key: 'tax', label: 'Steuern' },
      { key: 'invoice', label: 'Rechnungsdesign' },
      { key: 'defaults', label: 'Standardwerte' },
      { key: 'appearance', label: 'Darstellung' },
      { key: 'security', label: 'Sicherheit' },
    ] as tab}
      <button
        type="button"
        class="px-3 py-1.5 text-sm rounded-lg font-medium transition-colors {settingsTab === tab.key ? 'bg-accent-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
        onclick={() => (settingsTab = tab.key)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <!-- Tab: Profil & Bank -->
  {#if settingsTab === 'profile'}
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

    <div class="flex justify-end">
      <Button type="submit" loading={saving}>{t('settings.save')}</Button>
    </div>
  </form>
  {/if}

  <!-- Tab: Steuern -->
  {#if settingsTab === 'tax'}
  <form onsubmit={handleSubmit} class="max-w-2xl space-y-8">
    <Card>
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('settings.taxSettings')}</h2>

      {#if !settings.taxId && !settings.vatId}
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 mb-4">
          {t('settings.taxIdWarningBanner')}
        </div>
      {/if}

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

    <div class="flex justify-end">
      <Button type="submit" loading={saving}>{t('settings.save')}</Button>
    </div>
  </form>
  {/if}

  <!-- Tab: Standardwerte -->
  {#if settingsTab === 'defaults'}
  <form onsubmit={handleSubmit} class="max-w-2xl space-y-8">
    <Card>
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('settings.defaults')}</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label={t('settings.taxFreeAllowance')} type="number" step="0.01" bind:value={settings.taxFreeAllowance} />
        <Input label={t('settings.defaultPaymentDays')} type="number" bind:value={settings.defaultPaymentDays} />
        <Input label={t('settings.defaultHourlyRate')} type="number" step="0.01" bind:value={settings.defaultHourlyRate} />
      </div>
    </Card>

    <div class="flex justify-end">
      <Button type="submit" loading={saving}>{t('settings.save')}</Button>
    </div>
  </form>
  {/if}

  <!-- Tab: Darstellung -->
  {#if settingsTab === 'appearance'}
  <div class="max-w-2xl space-y-8">
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

  </div>
  {/if}

  <!-- Tab: Rechnungsdesign -->
  {#if settingsTab === 'invoice'}
  <form onsubmit={handleSubmit} class="max-w-3xl space-y-8">
    <Card>
      <h2 class="text-base font-semibold text-gray-900 mb-4">{t('settings.invoiceDesign')}</h2>

      <label class="text-sm font-medium text-gray-700 mb-2 block">{t('settings.invoiceTemplate')}</label>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {#each templates as tmpl}
          <button
            type="button"
            class="p-3 rounded-xl border-2 transition-all text-left {settings.invoiceTemplate === tmpl.key ? 'border-accent-500 ring-2 ring-accent-500/20' : 'border-gray-200 hover:border-gray-300'}"
            onclick={() => { settings!.invoiceTemplate = tmpl.key; }}
          >
            <div class="h-15 bg-gray-50 rounded mb-2 flex items-center justify-center overflow-hidden">
              {#if tmpl.key === 'standard'}
                <!-- Dark top bar + line + table -->
                <div class="w-full h-full flex flex-col p-1">
                  <div class="h-2.5 rounded-sm mb-1" style="background-color: {settings.invoiceAccentColor}"></div>
                  <div class="h-px bg-gray-300 mb-1"></div>
                  <div class="flex-1 flex flex-col gap-0.5">
                    <div class="h-1 bg-gray-200 rounded-sm w-full"></div>
                    <div class="h-1 bg-gray-200 rounded-sm w-full"></div>
                    <div class="h-1 bg-gray-200 rounded-sm w-3/4"></div>
                  </div>
                </div>
              {:else if tmpl.key === 'modern-minimal'}
                <!-- Thin lines + whitespace -->
                <div class="w-full h-full flex flex-col justify-between p-2">
                  <div class="h-px bg-gray-300"></div>
                  <div class="h-px bg-gray-200"></div>
                  <div class="h-px bg-gray-300"></div>
                </div>
              {:else if tmpl.key === 'serios-klassisch'}
                <!-- Fold marks left + text blocks -->
                <div class="w-full h-full flex p-1">
                  <div class="w-0.5 h-full flex flex-col justify-around mr-1.5">
                    <div class="w-0.5 h-1 bg-gray-400"></div>
                    <div class="w-0.5 h-1 bg-gray-400"></div>
                  </div>
                  <div class="flex-1 flex flex-col gap-1 pt-1">
                    <div class="h-1.5 bg-gray-200 rounded-sm w-2/3"></div>
                    <div class="h-1 bg-gray-200 rounded-sm w-full"></div>
                    <div class="h-1 bg-gray-200 rounded-sm w-full"></div>
                    <div class="h-1 bg-gray-200 rounded-sm w-1/2"></div>
                  </div>
                </div>
              {:else if tmpl.key === 'freelancer-kompakt'}
                <!-- Thin accent top line + dense blocks -->
                <div class="w-full h-full flex flex-col p-1">
                  <div class="h-0.5 rounded-full mb-1" style="background-color: {settings.invoiceAccentColor}"></div>
                  <div class="flex-1 flex flex-col gap-0.5">
                    <div class="h-1 bg-gray-300 rounded-sm w-full"></div>
                    <div class="h-1 bg-gray-200 rounded-sm w-full"></div>
                    <div class="h-1 bg-gray-300 rounded-sm w-full"></div>
                    <div class="h-1 bg-gray-200 rounded-sm w-full"></div>
                    <div class="h-1 bg-gray-300 rounded-sm w-2/3"></div>
                  </div>
                </div>
              {:else if tmpl.key === 'agentur'}
                <!-- Accent sidebar left + content right -->
                <div class="w-full h-full flex p-1">
                  <div class="w-1.5 h-full rounded-sm mr-1.5" style="background-color: {settings.invoiceAccentColor}"></div>
                  <div class="flex-1 flex flex-col gap-0.5 pt-0.5">
                    <div class="h-1.5 bg-gray-200 rounded-sm w-2/3"></div>
                    <div class="h-1 bg-gray-200 rounded-sm w-full"></div>
                    <div class="h-1 bg-gray-200 rounded-sm w-full"></div>
                    <div class="h-1 bg-gray-200 rounded-sm w-3/4"></div>
                  </div>
                </div>
              {:else if tmpl.key === 'handwerk'}
                <!-- Bold header bar + numbered rows -->
                <div class="w-full h-full flex flex-col p-1">
                  <div class="h-2 rounded-sm mb-1" style="background-color: {settings.invoiceAccentColor}"></div>
                  <div class="flex-1 flex flex-col gap-0.5">
                    {#each [1, 2, 3] as _}
                      <div class="flex gap-0.5">
                        <div class="w-2 h-1 rounded-sm" style="background-color: {settings.invoiceAccentColor}; opacity: 0.3"></div>
                        <div class="flex-1 h-1 bg-gray-200 rounded-sm"></div>
                      </div>
                    {/each}
                  </div>
                </div>
              {:else if tmpl.key === 'beratung'}
                <!-- Small header + wide table -->
                <div class="w-full h-full flex flex-col p-1">
                  <div class="h-1 bg-gray-300 rounded-sm w-1/3 mb-1"></div>
                  <div class="flex-1 border border-gray-200 rounded-sm flex flex-col">
                    <div class="h-1.5 bg-gray-100 border-b border-gray-200"></div>
                    <div class="flex-1 flex flex-col gap-0.5 p-0.5">
                      <div class="h-1 bg-gray-200 rounded-sm w-full"></div>
                      <div class="h-1 bg-gray-200 rounded-sm w-full"></div>
                    </div>
                  </div>
                </div>
              {:else if tmpl.key === 'dienstleistung'}
                <!-- Colored header row + alternating rows -->
                <div class="w-full h-full flex flex-col p-1">
                  <div class="h-1.5 rounded-sm mb-0.5" style="background-color: {settings.invoiceAccentColor}; opacity: 0.8"></div>
                  <div class="flex-1 flex flex-col gap-0.5">
                    <div class="h-1 bg-gray-100 rounded-sm w-full"></div>
                    <div class="h-1 bg-gray-200 rounded-sm w-full"></div>
                    <div class="h-1 bg-gray-100 rounded-sm w-full"></div>
                    <div class="h-1 bg-gray-200 rounded-sm w-full"></div>
                  </div>
                </div>
              {/if}
            </div>
            <div class="text-sm font-medium text-gray-900">{tmpl.name}</div>
            <div class="text-xs text-gray-500">{tmpl.desc}</div>
          </button>
        {/each}
      </div>

      <div class="mt-4">
        <label class="text-sm font-medium text-gray-700 mb-2 block">{t('settings.invoiceAccentColor')}</label>
        <div class="flex items-center gap-2 flex-wrap">
          {#each colorPalette as color}
            <button
              type="button"
              class="w-8 h-8 rounded-full border-2 transition-all {settings.invoiceAccentColor === color ? 'border-gray-900 ring-2 ring-gray-900/20 scale-110' : 'border-gray-200 hover:scale-105'}"
              style="background-color: {color}"
              onclick={() => { settings!.invoiceAccentColor = color; }}
            />
          {/each}
          <!-- Custom picker -->
          <label class="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors relative overflow-hidden">
            <span class="text-gray-400 text-xs">+</span>
            <input
              type="color"
              class="absolute inset-0 opacity-0 cursor-pointer"
              bind:value={settings.invoiceAccentColor}
            />
          </label>
        </div>
      </div>
    </Card>

    <div class="flex justify-end">
      <Button type="submit" loading={saving}>{t('settings.save')}</Button>
    </div>
  </form>
  {/if}

  <!-- Tab: Sicherheit -->
  {#if settingsTab === 'security'}
  <form onsubmit={handlePasswordChange} class="max-w-2xl">
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
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('settings.backupInfo')}</p>
      <p class="text-sm text-amber-600 dark:text-amber-400 mb-2">{t('settings.backupWarning')}</p>
      <p class="text-xs text-gray-500 dark:text-gray-500 mb-4">{t('settings.backupFrequency')}</p>
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
{/if}
