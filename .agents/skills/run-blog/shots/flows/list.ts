/**
 * The flows, in the order they run. Adding one: a file beside this one that
 * exports a `Flow` (see `context.ts`), and a line here.
 */
import { accountAndLogout } from "./account-and-logout.ts";
import { anonymousHome } from "./anonymous-home.ts";
import { clientNavigation } from "./client-navigation.ts";
import type { Flow } from "./context.ts";
import { headingAnchorToast } from "./heading-anchor-toast.ts";
import { throttledNavigation } from "./throttled-navigation.ts";

export const FLOWS: ReadonlyArray<Flow> = [
  anonymousHome,
  clientNavigation,
  headingAnchorToast,
  accountAndLogout,
  throttledNavigation,
];
