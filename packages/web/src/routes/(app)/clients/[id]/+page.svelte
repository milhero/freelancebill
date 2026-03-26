<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getClient, updateClient } from '$lib/api/clients.js';
  import type { Client } from '@freelancebill/shared';
  import { t } from '$lib/i18n/index.svelte.js';
  import PageHeader from '$lib/components/layout/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { showToast } from '$lib/stores/toast.svelte.js';

  let client = $state<Client | null>(null);
  let saving = $state(false);

  onMount(async () => {
    const res = await getClient($page.params.id);
    client = res.data;
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!client) return;
    saving = true;
    try {
      await updateClient(client.id, {
        name: client.name,
        addressStreet: client.addressStreet || undefined,
        addressZip: client.addressZip || undefined,
        addressCity: client.addressCity || undefined,
        contactPerson: client.contactPerson || undefined,
        email: client.email || undefined,
        phone: client.phone || undefined,
        notes: client.notes || undefined,
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

{#if client}
  <PageHeader title={client.name} />

  <form onsubmit={handleSubmit} class="max-w-2xl">
    <Card>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2">
          <Input label={t('clients.name')} bind:value={client.name} required />
        </div>
        <div class="sm:col-span-2">
          <Input label={t('clients.address')} bind:value={client.addressStreet} />
        </div>
        <Input label={t('settings.zip')} bind:value={client.addressZip} />
        <Input label={t('settings.city')} bind:value={client.addressCity} />
        <Input label={t('clients.contactPerson')} bind:value={client.contactPerson} />
        <Input label={t('clients.email')} type="email" bind:value={client.email} />
        <Input label={t('clients.phone')} bind:value={client.phone} />
        <div class="sm:col-span-2">
          <Textarea label={t('clients.notes')} bind:value={client.notes} />
        </div>
      </div>
    </Card>

    <div class="flex justify-end gap-3 mt-6">
      <Button variant="ghost" href="/clients">{t('common.cancel')}</Button>
      <Button type="submit" loading={saving}>{t('clients.save')}</Button>
    </div>
  </form>
{/if}
