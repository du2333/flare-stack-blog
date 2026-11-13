import type { toast as sonnerToast } from "sonner";

/**
 * The toast the public site calls. Sonner is 33 KB and a visitor sees a toast
 * only after an error, a logout or a copied link, so it stays out of the first
 * load: a call waits here until the `Toaster` has loaded, mounted and handed
 * over sonner's `toast` (`provideToast`), then runs. The first call is also
 * what makes the public layout mount that `Toaster` (`LazyToaster`).
 *
 * The Admin imports sonner directly and mounts its `Toaster` up front.
 */
type Sonner = typeof sonnerToast;
type Message = Parameters<Sonner["success"]>[0];
type Options = Parameters<Sonner["success"]>[1];

const waiting: Array<(sonner: Sonner) => void> = [];
const listeners = new Set<() => void>();
let sonner: Sonner | undefined;
let requested = false;

function show(run: (sonner: Sonner) => void) {
  // A call on the server has no one to show it to, and this module outlives
  // the request there.
  if (typeof window === "undefined") return;
  if (sonner) {
    run(sonner);
    return;
  }
  waiting.push(run);
  if (requested) return;
  requested = true;
  for (const listener of listeners) listener();
}

export const toast = {
  success: (message: Message, options?: Options) =>
    show((s) => void s.success(message, options)),
  error: (message: Message, options?: Options) =>
    show((s) => void s.error(message, options)),
  warning: (message: Message, options?: Options) =>
    show((s) => void s.warning(message, options)),
};

/** Called by a mounted `Toaster`; shows what was asked for before it was. */
export function provideToast(loaded: Sonner) {
  sonner = loaded;
  for (const run of waiting.splice(0)) run(loaded);
  return () => {
    if (sonner === loaded) sonner = undefined;
  };
}

export function subscribeToastRequested(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function isToastRequested() {
  return requested;
}
