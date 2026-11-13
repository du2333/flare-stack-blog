import type { toast as sonnerToast } from "sonner";

/**
 * The one way to show a toast: every module imports `toast` from here, never
 * from `sonner` (a lint rule holds that). Sonner is 33 KB and a visitor sees a
 * toast only after an error, a logout or a copied link, so it stays out of the
 * first load: a call waits here until a `Toaster` has loaded, mounted and
 * handed over sonner's `toast` (`provideToast`), then runs, in order. On the
 * public site the first call is also what makes the layout mount that
 * `Toaster` (`LazyToaster`); the Admin mounts its own up front.
 *
 * Each call returns the toast's id, so it can be passed to `dismiss` or given
 * as `options.id` to update it, whether the call was queued or not.
 */
type Sonner = typeof sonnerToast;
type Message = Parameters<Sonner["success"]>[0];
type Options = Parameters<Sonner["success"]>[1];
type Id = string | number;
type Kind = "success" | "error" | "warning" | "info" | "loading" | "message";

const waiting: Array<(sonner: Sonner) => void> = [];
const listeners = new Set<() => void>();
let sonner: Sonner | undefined;
let requested = false;
let issued = 0;

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

function emit(kind: Kind, message: Message, options?: Options): Id {
  // Sonner makes the id when it runs the call; a queued call has to have one
  // now to give back.
  const id = options?.id ?? `toast-${++issued}`;
  show((s) => void s[kind](message, { ...options, id }));
  return id;
}

export const toast = {
  success: (message: Message, options?: Options) =>
    emit("success", message, options),
  error: (message: Message, options?: Options) =>
    emit("error", message, options),
  warning: (message: Message, options?: Options) =>
    emit("warning", message, options),
  info: (message: Message, options?: Options) => emit("info", message, options),
  loading: (message: Message, options?: Options) =>
    emit("loading", message, options),
  message: (message: Message, options?: Options) =>
    emit("message", message, options),
  /**
   * Closes a toast by its `id`. With sonner not loaded and nothing requested
   * there is nothing on screen to close, so this does not load it; once a
   * request is waiting it queues behind it, so the order is kept.
   */
  dismiss: (id: Id) => {
    if (sonner) sonner.dismiss(id);
    else if (requested) waiting.push((s) => void s.dismiss(id));
  },
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
