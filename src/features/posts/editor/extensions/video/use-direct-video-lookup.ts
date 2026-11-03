import { useEffect, useRef, useState } from "react";
import type { DirectVideoLookup } from "@/features/posts/utils/video-source";
import { useDebounce } from "@/hooks/use-debounce";

/** How long typing must pause before the address is looked up. */
export const LOOKUP_DELAY_MS = 400;

export type ResolveDirectVideo = (url: string) => Promise<DirectVideoLookup>;

export type DirectVideoLookupState =
  /** There is no address to look up. */
  | { status: "idle" }
  /** The address is typed but not yet answered, including while typing. */
  | { status: "reading" }
  | { status: "done"; result: DirectVideoLookup };

/**
 * What the server finds at `address`, asked once typing pauses. An answer
 * stays tied to the address it was for, so a stale one never shows beside a
 * newer address. `seed` is an answer already known, such as a reopened
 * block's, which is not asked for again. Without `resolve` nothing is asked
 * and the address counts as unreachable, so it can still be filled in by
 * hand.
 */
export function useDirectVideoLookup(
  address: string | null,
  resolve: ResolveDirectVideo | undefined,
  seed?: { address: string; result: DirectVideoLookup },
): DirectVideoLookupState {
  const settled = useDebounce(address, LOOKUP_DELAY_MS);
  const [found, setFound] = useState(seed ?? null);
  const foundFor = useRef(seed?.address ?? null);

  useEffect(() => {
    if (!settled || !resolve || foundFor.current === settled) return;
    let stale = false;
    void resolve(settled)
      .catch((): DirectVideoLookup => ({ kind: "unreachable" }))
      .then((result) => {
        if (stale) return;
        foundFor.current = settled;
        setFound({ address: settled, result });
      });
    return () => {
      stale = true;
    };
  }, [settled, resolve]);

  if (!address) return { status: "idle" };
  if (!resolve) return { status: "done", result: { kind: "unreachable" } };
  if (found?.address === address)
    return { status: "done", result: found.result };
  return { status: "reading" };
}
