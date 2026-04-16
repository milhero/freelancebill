<script lang="ts">
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { updateInvoiceStatus } from '$lib/api/invoices.js';
  import { toISODate } from '@freelancebill/shared';
  import { showToast } from '$lib/stores/toast.svelte.js';
  import { t } from '$lib/i18n/index.svelte.js';

  interface Props {
    open: boolean;
    invoiceId: string;
    onclose: () => void;
    onstatusChanged: () => void;
  }

  let { open, invoiceId, onclose, onstatusChanged }: Props = $props();
  let paidDate = $state(toISODate(new Date()));
  let saving = $state(false);
  let showDatePicker = $state(false);

  async function markPaid(date: string) {
    saving = true;
    try {
      await updateInvoiceStatus(invoiceId, { status: 'paid', paidDate: date });
      showToast(t('invoices.paid'), 'success');
      showDatePicker = false;
      onstatusChanged();
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      saving = false;
    }
  }
</script>

<Modal {open} title="Als bezahlt markieren" onclose={() => { showDatePicker = false; onclose(); }}>
  {#snippet children()}
    <div class="flex flex-col gap-3">
      <!-- Quick action: mark as paid today (1 click!) -->
      <button
        type="button"
        class="w-full flex items-center justify-between p-3 rounded-lg border border-success-200 bg-success-50 hover:bg-success-100 transition-colors text-left"
        onclick={() => markPaid(toISODate(new Date()))}
        disabled={saving}
      >
        <div>
          <div class="font-medium text-success-800">Heute bezahlt</div>
          <div class="text-xs text-success-600">{new Date().toLocaleDateString('de-DE')}</div>
        </div>
        <span class="text-success-600 text-lg">✓</span>
      </button>

      <!-- Option: different date -->
      {#if !showDatePicker}
        <button
          type="button"
          class="text-sm text-gray-500 hover:text-gray-700 transition-colors text-center"
          onclick={() => (showDatePicker = true)}
        >
          Anderes Datum wählen...
        </button>
      {:else}
        <div class="flex items-end gap-2">
          <div class="flex-1">
            <label class="block text-xs font-medium text-gray-500 mb-1">Zahlungseingangsdatum</label>
            <input
              type="date"
              bind:value={paidDate}
              class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
            />
          </div>
          <Button onclick={() => markPaid(paidDate)} loading={saving}>Bestätigen</Button>
        </div>
      {/if}
    </div>
  {/snippet}
</Modal>
