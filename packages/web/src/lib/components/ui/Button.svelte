<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    href?: string;
    type?: string;
    disabled?: boolean;
    onclick?: (e: Event) => void;
    class?: string;
    children: Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    loading = false,
    href,
    type,
    disabled,
    onclick,
    class: className = '',
    children,
  }: Props = $props();

  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:ring-offset-2 dark:focus:ring-offset-gray-50 disabled:opacity-50 disabled:cursor-not-allowed no-underline';

  const variantClasses: Record<string, string> = {
    primary: 'bg-accent-600 text-white hover:bg-accent-700 active:bg-accent-800',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300',
    ghost: 'text-gray-600 hover:bg-gray-100 active:bg-gray-200',
    danger: 'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800',
  };

  const sizeClasses: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
</script>

{#if href}
  <a {href} class={classes}>
    {@render children()}
  </a>
{:else}
  <button
    class={classes}
    type={type || 'button'}
    disabled={disabled || loading}
    {onclick}
  >
    {#if loading}
      <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    {/if}
    {@render children()}
  </button>
{/if}
