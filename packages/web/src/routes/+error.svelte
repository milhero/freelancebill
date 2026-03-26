<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="flex min-h-screen items-center justify-center">
  <div class="text-center">
    <h1 class="text-6xl font-bold text-gray-900">{$page.status}</h1>
    <p class="mt-4 text-lg text-gray-500">{$page.error?.message || 'Something went wrong'}</p>
    <a href="/" class="mt-8 inline-block text-accent-600 hover:text-accent-700">Back to Dashboard</a>
  </div>
</div>
