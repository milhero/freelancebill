import type { User } from '@freelancebill/shared';
import { getMe, logout as apiLogout } from '$lib/api/auth.js';
import { goto } from '$app/navigation';

let user = $state<User | null>(null);
let loading = $state(true);
let authenticated = $derived(user !== null);

export function getAuth() {
  return {
    get user() { return user; },
    get loading() { return loading; },
    get authenticated() { return authenticated; },
  };
}

export async function checkAuth() {
  loading = true;
  try {
    const res = await getMe();
    user = res.data;
  } catch {
    user = null;
  } finally {
    loading = false;
  }
}

export function setUser(u: User) {
  user = u;
  loading = false;
}

export async function performLogout() {
  try {
    await apiLogout();
  } catch {
    // ignore
  }
  user = null;
  goto('/login');
}
