<script lang="ts">
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';

  interface Props {
    open: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    onconfirm: () => void;
    oncancel: () => void;
  }

  let {
    open,
    title = 'Confirm',
    message,
    confirmText = 'Delete',
    onconfirm,
    oncancel,
  }: Props = $props();
</script>

<Modal {open} {title} onclose={oncancel}>
  {#snippet children()}
    <p class="text-sm text-gray-600">{message}</p>
  {/snippet}
  {#snippet actions()}
    <Button variant="ghost" onclick={oncancel}>Cancel</Button>
    <Button variant="danger" onclick={onconfirm}>{confirmText}</Button>
  {/snippet}
</Modal>
