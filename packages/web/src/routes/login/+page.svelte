<script lang="ts">
  import { goto } from '$app/navigation';
  import { login } from '$lib/api/auth.js';
  import { setUser } from '$lib/stores/auth.svelte.js';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      const res = await login(email, password);
      setUser(res.data);
      goto('/');
    } catch (err: any) {
      error = err.message || 'Login failed';
    } finally {
      loading = false;
    }
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50/50">
  <div class="w-full max-w-sm">
    <div class="text-center mb-8">
      <h1 class="text-2xl font-semibold tracking-tight text-gray-900">FreelanceBill</h1>
      <p class="mt-2 text-sm text-gray-500">Melden Sie sich an, um fortzufahren</p>
    </div>

    <form onsubmit={handleSubmit} class="bg-white dark:bg-gray-100 rounded-2xl border border-gray-100 dark:border-gray-200 shadow-sm p-8 space-y-5">
      <Input
        label="E-Mail"
        type="email"
        bind:value={email}
        placeholder="name@example.com"
        required
        autocomplete="email"
      />

      <Input
        label="Passwort"
        type="password"
        bind:value={password}
        placeholder="Passwort eingeben"
        required
        autocomplete="current-password"
      />

      {#if error}
        <p class="text-sm text-danger-600">{error}</p>
      {/if}

      <Button type="submit" class="w-full" {loading}>
        Anmelden
      </Button>
    </form>
  </div>
</div>
