<script lang="ts">
  import { goto } from '$app/navigation';
  import { createClient } from '$lib/api/clients.js';
  import { t } from '$lib/i18n/index.svelte.js';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { showToast } from '$lib/stores/toast.svelte.js';

  let name = $state('');
  let addressStreet = $state('');
  let addressZip = $state('');
  let addressCity = $state('');
  let contactPerson = $state('');
  let email = $state('');
  let phone = $state('');
  let notes = $state('');
  let saving = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    saving = true;
    try {
      await createClient({
        name,
        addressStreet: addressStreet || undefined,
        addressZip: addressZip || undefined,
        addressCity: addressCity || undefined,
        contactPerson: contactPerson || undefined,
        email: email || undefined,
        phone: phone || undefined,
        notes: notes || undefined,
      });
      showToast(t('common.success'), 'success');
      goto('/clients');
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      saving = false;
    }
  }
</script>

<PageHeader title={t('clients.new')} />

<form onsubmit={handleSubmit} class="max-w-2xl">
  <Card>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="sm:col-span-2">
        <Input label={t('clients.name')} bind:value={name} required />
      </div>
      <div class="sm:col-span-2">
        <Input label={t('clients.address')} bind:value={addressStreet} />
      </div>
      <Input label={t('settings.zip')} bind:value={addressZip} />
      <Input label={t('settings.city')} bind:value={addressCity} />
      <Input label={t('clients.contactPerson')} bind:value={contactPerson} />
      <Input label={t('clients.email')} type="email" bind:value={email} />
      <Input label={t('clients.phone')} bind:value={phone} />
      <div class="sm:col-span-2">
        <Textarea label={t('clients.notes')} bind:value={notes} />
      </div>
    </div>
  </Card>

  <div class="flex justify-end gap-3 mt-6">
    <Button variant="ghost" href="/clients">{t('common.cancel')}</Button>
    <Button type="submit" loading={saving}>{t('clients.create')}</Button>
  </div>
</form>
