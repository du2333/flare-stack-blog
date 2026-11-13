import { lazy, Suspense, useSyncExternalStore } from "react";
import { isToastRequested, subscribeToastRequested } from "@/lib/toast";

const Toaster = lazy(() =>
  import("./toaster").then((module) => ({ default: module.Toaster })),
);

/**
 * The public site's toast container. Nothing mounts until the first toast is
 * requested (`@/lib/toast`), so sonner is not part of the first load.
 */
export function LazyToaster() {
  const requested = useSyncExternalStore(
    subscribeToastRequested,
    isToastRequested,
    () => false,
  );
  if (!requested) return null;
  return (
    <Suspense fallback={null}>
      <Toaster />
    </Suspense>
  );
}
