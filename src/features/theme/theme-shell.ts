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
 * apart treats `post` as `inner`. A shell is told two of them: the kind of
 * the page the address names (`pageKind`) and that of the page `main` holds
 * (`pageOnScreen`), which differ for as long as a navigation takes.
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
  /**
   * Renders nothing when it has nothing to show (the shell leaves no gap for
   * it), and takes its narrow or its wide form from the width of the `card`
   * container around it, if the shell declares one.
   */
  content: ReactNode;
}

/** A Theme's own options, read from Site Config and filled in with its defaults. */
export type ThemeOptionValues = SiteConfig["theme"]["options"][string];

/**
 * A shell only arranges what it is given (docs/theme-shell-checklist.md). It
 * shows every navigation entry and every sidebar card, each once, and never
 * decides which cards a page has or whether a page is focused: the cache
 * tags of a page assume the cards the host chose.
 *
 * Where the cards go is the shell's: beside the content, after it, or, on
 * wide screens only, some of them before it. It may stand them in more than
 * one group; a group keeps the given order, and one placed before the
 * content comes before it in the document. Below 1024px every card follows
 * the content.
 *
 * A card is not told where it stands. It takes its narrow form (a column
 * beside the content) or its wide, low one from the width of the CSS
 * container named `card` around it. A shell that gives cards more room than
 * a narrow column makes the slot of each card that container in its
 * stylesheet (`container: card / inline-size`, as `.immersive-card` in
 * `shells/immersive/immersive.css`); where a shell declares none, every card
 * keeps its narrow form.
 *
 * Every shell also:
 * - wraps its tree in `FirstScreenProvider`, which back to top, the table of
 *   contents and the navbar read;
 * - sets the `--shell-*` positioning properties on `:root[data-theme="<id>"]`
 *   in its Theme's stylesheet, each value from the shell's own media queries
 *   (see `shells/classic/classic-shell.css`). What renders outside the shell
 *   reads them and knows no breakpoint of a Theme:
 *   - `--shell-floating-actions-left`: from lg, the left edge of back to top
 *     and the page's own floating actions, from the left of the window.
 *   - `--shell-floating-actions-position`: optional. Left out, those are
 *     fixed to the window. A shell that stands them in a box of its own,
 *     which it then places itself, sets `static` (「沉浸」 does: its box
 *     sticks to the foot of the window and ends where the footer begins, so
 *     they rest above the footer at the end of a page).
 *   - `--shell-floating-actions-size`: optional. From lg, the side of back
 *     to top and of each of the page's actions; left out, 3.75rem. A shell
 *     that rests them where there is less room says how large they are
 *     (「侧栏」 does, in the foot of its rail).
 *   - `--shell-content-inset-left`, `--shell-content-inset-right`:
 *     optional. How far from either edge of the window the content starts,
 *     where the shell keeps a part of the window's width for a frame of
 *     its own (the rail of 「侧栏」). What floats centred over the foot of
 *     the window, such as the bar of a Theme preview, is centred in the
 *     rest and never lies on that frame. Left out, the whole window.
 *   - `--shell-toc-side`: `block` where the table of contents of a Post
 *     stands beside the article or in the shell's slot, `none` where it
 *     does not (the default).
 *   - `--shell-toc-compact`: `flex` where the button in the floating column
 *     opens the table of contents instead (the default), `none` where it
 *     does not; an open list closes with it.
 *   - `--shell-toc-top`: the top of the side table of contents, from the top
 *     of the window (it is fixed).
 *   - `--shell-toc-left`: the left edge of the side table of contents, from
 *     the left edge of the article column, so `100%` is the column's width
 *     and a negative value puts it in the left gutter.
 *   - `--shell-toc-width`: the width of the side table of contents, which
 *     adds no padding of its own; resolved on a fixed element, so a
 *     percentage is of the window.
 *   The last three place the list only where the shell gives it no slot.
 *   The list follows the article column by itself, when the window is
 *   resized and when the column changes width without that (a rail that
 *   comes in, a reading column the shell switches to). Where the footer
 *   region runs under it, as a footer as wide as the window does, it ends
 *   short of the footer by itself.
 * - marks its root `data-theme-shell="<id>"` and its regions
 *   `data-shell-region="body" | "sidebar" | "main" | "footer"`, with every
 *   group of cards a `sidebar` and, like the footer, inside the body, so
 *   shared styles such as the render-error fallback never use a shell's
 *   class names.
 *
 * A shell may give the side table of contents a place in its own tree
 * instead of the fixed one, such as a box in a rail, by rendering one
 * `TocSlot` (`components/toc-slot.tsx`) there, with nothing in it. The list
 * then fills the slot's box and scrolls within it (give the slot a definite
 * height), shows from the top of the page, and reads only `--shell-toc-side`
 * and `--shell-toc-compact`: at the widths where the stylesheet hides the
 * slot it sets them to `none` and `flex`, and the button opens the list. A
 * Post without headings leaves the slot empty. The page carries
 * `[data-table-of-contents]` from the first paint exactly while it has a
 * table of contents, so the stylesheet can show something else in the
 * slot's place with `:has()`, without the Post page knowing of it. The slot
 * stays for as long as a Post's page is in `main`: render it on every page,
 * or switch it with `pageOnScreen`, never with `pageKind`, which changes
 * before the page that is left has gone.
 */
export interface ThemeShellProps {
  /**
   * The kind of the page the address names. It changes with the click, so
   * what answers the reader at once follows it (a first screen that opens
   * or folds away).
   */
  pageKind: PageKind;
  /**
   * The kind of the page `main` holds. During a navigation the page that is
   * left stays in `main` until the next one has loaded, however long that
   * takes, and the two are swapped in one commit; this changes in that
   * commit. Everything a shell lays out around the page follows it (a
   * reading column, where the cards stand, a slot for the table of
   * contents), so no page is ever seen in the layout of another.
   */
  pageOnScreen: PageKind;
  /** Its Theme's own options (`Theme.options` in `themes.ts`). */
  options: ThemeOptionValues;
  navOptions: Array<NavOption>;
  /** In the order to show them within a group; empty on focused pages. */
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
