interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const MAX_TOASTS = 5;
const DURATIONS: Record<Toast['type'], number> = {
  success: 4000,
  info: 4000,
  error: 8000,
};

let toasts = $state<Toast[]>([]);
let nextId = 0;

export function getToasts() {
  return {
    get items() { return toasts; },
  };
}

export function showToast(message: string, type: Toast['type'] = 'info') {
  // Deduplicate: don't show same message if already visible
  if (toasts.some((t) => t.message === message && t.type === type)) return;

  const id = nextId++;
  toasts = [...toasts, { id, message, type }];

  // Enforce max toast limit
  if (toasts.length > MAX_TOASTS) {
    toasts = toasts.slice(-MAX_TOASTS);
  }

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
  }, DURATIONS[type]);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
}
