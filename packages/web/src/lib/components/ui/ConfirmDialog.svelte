<script lang="ts">
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';
  import { t } from '$lib/i18n/index.svelte.js';

  interface Props {
    open: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onconfirm: () => void;
    oncancel: () => void;
  }

  let {
    open,
    title = t('common.confirm'),
    message,
    confirmText = t('common.delete'),
    cancelText = t('common.cancel'),
    onconfirm,
    oncancel,
  }: Props = $props();
</script>

<Modal {open} {title} onclose={oncancel}>
  {#snippet children()}
    <p class="text-sm text-gray-600">{message}</p>
  {/snippet}
  {#snippet actions()}
    <Button variant="ghost" onclick={oncancel}>{cancelText}</Button>
    <Button variant="danger" onclick={onconfirm}>{confirmText}</Button>
  {/snippet}
</Modal>
