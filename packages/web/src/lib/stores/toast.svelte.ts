interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toasts = $state<Toast[]>([]);
let nextId = 0;

export function getToasts() {
  return {
    get items() { return toasts; },
  };
}

export function showToast(message: string, type: Toast['type'] = 'info') {
  const id = nextId++;
  toasts = [...toasts, { id, message, type }];
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
  }, 4000);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
}
