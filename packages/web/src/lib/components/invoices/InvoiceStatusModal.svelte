<script lang="ts">
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import { updateInvoiceStatus } from '$lib/api/invoices.js';
  import { toISODate } from '@freelancebill/shared';
  import { showToast } from '$lib/stores/toast.svelte.js';

  interface Props {
    open: boolean;
    invoiceId: string;
    onclose: () => void;
    onstatusChanged: () => void;
  }

  let { open, invoiceId, onclose, onstatusChanged }: Props = $props();
  let paidDate = $state(toISODate(new Date()));
  let saving = $state(false);

  async function handleConfirm() {
    saving = true;
    try {
      await updateInvoiceStatus(invoiceId, { status: 'paid', paidDate });
      showToast('Rechnung als bezahlt markiert', 'success');
      onstatusChanged();
    } catch {
      showToast('Fehler beim Aktualisieren', 'error');
    } finally {
      saving = false;
    }
  }
</script>

<Modal {open} title="Als bezahlt markieren" onclose={onclose}>
  {#snippet children()}
    <Input label="Zahlungseingangsdatum" type="date" bind:value={paidDate} required />
  {/snippet}
  {#snippet actions()}
    <Button variant="ghost" onclick={onclose}>Abbrechen</Button>
    <Button onclick={handleConfirm} loading={saving}>Bestaetigen</Button>
  {/snippet}
</Modal>
