/** Props shared by the public navigation and the auth and user layouts. */

/** A navigation entry that leads somewhere. */
export interface NavLinkOption {
  id: string;
  label: string;
  href: string;
  /** An http(s) address, opened in a new tab. */
  external: boolean;
  children?: never;
}

/**
 * A group of navigation links under a name. It has no address of its own
 * and opens its links instead (`NavGroupMenu` in a bar); they hold no links
 * in turn.
 */
export interface NavGroupOption {
  id: string;
  label: string;
  children: Array<NavLinkOption>;
  href?: never;
  external?: never;
}

/**
 * One navigation entry: a link, or a group of links (`isNavGroup`). A shell
 * that shows no groups lists `flattenNavOptions(navOptions)` instead.
 */
export type NavOption = NavLinkOption | NavGroupOption;

export interface UserInfo {
  name: string;
  image?: string | null;
  role?: string | null;
}

export interface AuthLayoutProps {
  onBack: () => void;
  children: React.ReactNode;
}

export interface UserLayoutProps {
  isAuthenticated: boolean;
  children: React.ReactNode;
}
