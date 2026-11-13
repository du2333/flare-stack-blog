/**
 * The flows, in the order they run. Adding one: a file beside this one that
 * exports a `Flow` (see `context.ts`), and a line here.
 */
import { accountAndLogout } from "./account-and-logout.ts";
import { adminPages } from "./admin-pages.ts";
import { anonymousHome } from "./anonymous-home.ts";
import { clientNavigation } from "./client-navigation.ts";
import { comment } from "./comment.ts";
import type { Flow } from "./context.ts";
import { headingAnchorToast } from "./heading-anchor-toast.ts";
import { nameGate } from "./name-gate.ts";
import { profileAndNotifications } from "./profile-and-notifications.ts";
import { signIn } from "./sign-in.ts";
import { throttledNavigation } from "./throttled-navigation.ts";
import { twoTabs } from "./two-tabs.ts";

export const FLOWS: ReadonlyArray<Flow> = [
  anonymousHome,
  clientNavigation,
  headingAnchorToast,
  signIn,
  accountAndLogout,
  profileAndNotifications,
  comment,
  nameGate,
  twoTabs,
  adminPages,
  throttledNavigation,
];
