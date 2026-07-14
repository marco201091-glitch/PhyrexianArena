export type AppAlertButton = {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
};

export type AppAlert = {
  id: number;
  title: string;
  message?: string;
  buttons: AppAlertButton[];
};

let current: AppAlert | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function showAppAlert(
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
) {
  current = {
    id: nextId++,
    title,
    message,
    buttons: buttons?.length ? buttons : [{ text: 'OK' }],
  };
  emit();
}

export function dismissAppAlert() {
  current = null;
  emit();
}

export const appAlertStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return current;
  },
};
