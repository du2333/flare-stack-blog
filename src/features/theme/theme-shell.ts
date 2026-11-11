import type { ComponentType, ReactNode } from "react";
import type { NavOption, UserInfo } from "@/components/layout/layout-props";
import type { SiteConfig } from "@/features/config/site-config.schema";

/**
 * What the host tells a shell about the current page. A focused page (sign-in,
 * profile, the friend-link form, a route error or not found) shows only its
 * content: the host gives it no sidebar cards. A Post's page is a kind of its
 * own, so a shell can lay it out apart from the other inner pages (the width
 * of the reading column, the cards beside the article or after it); the host
 * gives it the cards of an inner page. A shell that does not tell the two
 * apart treats `post` as `inner`.
 */
export type PageKind = "home" | "inner" | "post" | "focused";

/**
 * identity: who runs the site, read from Site Config only (the profile card).
 * feed: the latest entries of something (the latest Moments).
 * index: a way into the Posts (categories, tags).
 */
export type SidebarCardKind = "identity" | "feed" | "index";

export interface SidebarCard {
  /** Stable for the card, used as its key. */
  id: string;
  kind: SidebarCardKind;
  /** Hides itself when it has nothing to show. */
  content: ReactNode;
}

/**
 * A shell only arranges what it is given (docs/theme-shell-checklist.md). It
 * shows every navigation entry and every sidebar card, in the given order, and
 * never decides which cards a page has or whether a page is focused: the cache
 * tags of a page assume the cards the host chose.
 *
 * Every shell also:
 * - wraps its tree in `FirstScreenProvider`, which back to top, the table of
 *   contents and the navbar read;
 * - sets the `--shell-*` positioning properties on `:root[data-theme="<id>"]`
 *   in its Theme's stylesheet (see `shells/classic/classic-shell.css`);
 * - marks its root `data-theme-shell="<id>"` and its regions
 *   `data-shell-region="body" | "sidebar" | "main" | "footer"`, with the
 *   sidebar and footer inside the body, so shared styles such as the
 *   render-error fallback never use a shell's class names.
 */
/** A Theme's own options, read from Site Config and filled in with its defaults. */
export type ThemeOptionValues = SiteConfig["theme"]["options"][string];

export interface ThemeShellProps {
  pageKind: PageKind;
  /** Its Theme's own options (`Theme.options` in `themes.ts`). */
  options: ThemeOptionValues;
  navOptions: Array<NavOption>;
  /** Empty on focused pages. */
  sidebarCards: Array<SidebarCard>;
  user?: UserInfo;
  isSessionLoading: boolean;
  logout: () => Promise<void>;
  /** The page, already wrapped in the page transition. */
  children: ReactNode;
  footer: ReactNode;
  /** Back to top, with the page's own actions stacked above it. */
  floatingActions: ReactNode;
}

export interface ThemeShell {
  id: string;
  Shell: ComponentType<ThemeShellProps>;
  /**
   * Page kinds whose first screen already shows the site identity (avatar,
   * author, description). The host leaves identity cards out there. An
   * identity card reads only Site Config, which every cached page is tagged
   * with, so leaving it out never leaves a cached page missing a tag.
   */
  identityInFirstScreen: ReadonlyArray<Exclude<PageKind, "focused">>;
  /**
   * Page kinds whose first screen shows the Site Config tagline when one is
   * set. Left out, the shell never shows it. The shared shell tests hold a
   * shell to what it declares.
   */
  taglineOn?: ReadonlyArray<Exclude<PageKind, "focused">>;
}
