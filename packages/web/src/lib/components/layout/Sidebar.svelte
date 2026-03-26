<script lang="ts">
  import { page } from '$app/stores';
  import { t } from '$lib/i18n/index.svelte.js';
  import SidebarItem from './SidebarItem.svelte';

  interface Props {
    open: boolean;
    onclose: () => void;
  }

  let { open, onclose }: Props = $props();

  let navItems = $derived([
    { href: '/', label: t('nav.dashboard'), icon: 'dashboard' },
    { href: '/invoices', label: t('nav.invoices'), icon: 'invoice' },
    { href: '/expenses', label: t('nav.expenses'), icon: 'expense' },
    { href: '/documents', label: t('nav.documents'), icon: 'document' },
    { href: '/clients', label: t('nav.clients'), icon: 'client' },
    { href: '/projects', label: t('nav.projects'), icon: 'project' },
    { href: '/settings', label: t('nav.settings'), icon: 'settings' },
  ]);
</script>

<!-- Mobile overlay -->
{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onclick={onclose} onkeydown={() => {}}></div>
{/if}

<aside class="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-100 border-r border-gray-100 transform transition-transform duration-200 ease-out lg:translate-x-0 lg:static lg:z-auto {open ? 'translate-x-0' : '-translate-x-full'}">
  <div class="flex flex-col h-full">
    <!-- Logo -->
    <div class="flex items-center h-16 px-6 border-b border-gray-100">
      <span class="text-lg font-semibold tracking-tight text-gray-900">FreelanceBill</span>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {#each navItems as item}
        <SidebarItem
          href={item.href}
          label={item.label}
          icon={item.icon}
          active={item.href === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(item.href)}
          {onclose}
        />
      {/each}
    </nav>
  </div>
</aside>
