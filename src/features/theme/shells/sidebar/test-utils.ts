import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, render, screen, within } from "@testing-library/react";
import { createElement, useState } from "react";
import { expect } from "vitest";
import { FloatingActionsProvider } from "@/components/layout/floating-actions";
import type { NavOption, UserInfo } from "@/components/layout/layout-props";
import { resolveSiteConfig } from "@/features/config/config.resolve";
import type { SystemConfig } from "@/features/config/config.schema";
import TableOfContents from "@/features/posts/components/table-of-contents";
import type { TableOfContentsItem } from "@/features/posts/utils/toc";
import { m } from "@/paraglide/messages";
import { useFirstScreenHeight } from "../../components/first-screen";
import { sidebarCardsFor } from "../../components/sidebar-cards";
import { TocSlotProvider } from "../../components/toc-slot";
import type { PageKind, SidebarCard, ThemeShellProps } from "../../theme-shell";
import { resolveThemeOptions, selectTheme } from "../../themes";

/** What the tests of 「侧栏」 share: the shell as the host renders it, and its stylesheet as written. */
export const theme = selectTheme("sidebar");

/** Shaped like the host's list: the built-in entries, then the custom links. */
export const NAV_OPTIONS: Array<NavOption> = [
  { id: "home", label: "Nav home", href: "/", external: false },
  { id: "posts", label: "Nav posts", href: "/posts", external: false },
  { id: "moments", label: "Nav moments", href: "/moments", external: false },
  { id: "custom-0", label: "Nav about", href: "/about", external: false },
  {
    id: "custom-1",
    label: "Nav elsewhere",
    href: "https://example.com/",
    external: true,
  },
];

/** The same, with a group of two links between the Moments and the custom link. */
export const NAV_WITH_GROUP: Array<NavOption> = [
  ...NAV_OPTIONS.slice(0, 3),
  {
    id: "custom-2",
    label: "Nav group",
    children: [
      { id: "custom-2-0", label: "Nav one", href: "/one", external: false },
      { id: "custom-2-1", label: "Nav two", href: "/two", external: false },
    ],
  },
  ...NAV_OPTIONS.slice(3, 4),
];

export const SITE: SystemConfig["site"] = {
  title: "Engine Notes",
  author: "Ada",
  description: "Notes on engines.",
  tagline: "Slow and exact",
  social: [{ platform: "github", url: "https://github.com/ada" }],
};

/** What `matchMedia` answers for reduced motion; a test's `beforeEach` stubs it by this. */
export const reducedMotion = { matches: false };

export const HEADINGS: Array<TableOfContentsItem> = [
  { id: "first", text: "First heading", level: 2 },
  { id: "second", text: "Second heading", level: 2 },
];

/** The cards the host gives 「侧栏」 on a page, each showing only its id. */
export function cardsFor(pageKind: PageKind): Array<SidebarCard> {
  return sidebarCardsFor(pageKind, theme.shell).map(({ id, kind }) => ({
    id,
    kind,
    content: createElement("div", null, `Card ${id}`),
  }));
}

/**
 * The shell on screen. A navigation has two moments, as in the app: the
 * address changes (`goTo`), and later the page in `main` is replaced
 * (`arrive`); `visit` is both at once.
 */
export const onScreen = {
  /** Where the shell's first screen ends, as the page on screen is told. */
  firstScreenHeight: (): number => 0,
  /** The address names a page of this kind; `main` still holds the last one. */
  goTo: (_pageKind: PageKind): void => {},
  /** The page the address names is rendered in `main`. */
  arrive: async (): Promise<void> => {},
  visit: async (_pageKind: PageKind): Promise<void> => {},
};

/** A page: what a route renders in `main`. A Post's has its table of contents. */
function Page({
  kind,
  headers,
}: {
  kind: PageKind;
  headers: Array<TableOfContentsItem>;
}) {
  onScreen.firstScreenHeight = useFirstScreenHeight();
  return createElement(
    "div",
    { className: "relative", "data-page": kind },
    kind === "post" ? createElement(TableOfContents, { headers }) : null,
    createElement("p", null, "Page content"),
  );
}

export async function renderShell({
  pageKind,
  site = SITE,
  user,
  isSessionLoading = false,
  path = "/",
  navOptions = NAV_OPTIONS,
  cards,
  stored,
  headers = HEADINGS,
}: {
  pageKind: PageKind;
  site?: SystemConfig["site"];
  user?: UserInfo;
  isSessionLoading?: boolean;
  path?: string;
  navOptions?: Array<NavOption>;
  cards?: Array<SidebarCard>;
  /** 「侧栏」's options as Site Config holds them. */
  stored?: Record<string, unknown>;
  /** The headings of a Post's page; none for a Post without a table of contents. */
  headers?: Array<TableOfContentsItem>;
}) {
  function Host() {
    const [named, setNamed] = useState(pageKind);
    const [rendered, setRendered] = useState({ kind: pageKind, serial: 0 });
    onScreen.goTo = (kind) => act(() => setNamed(kind));
    const replace = (kind: PageKind) =>
      setRendered(({ serial }) => ({ kind, serial: serial + 1 }));
    onScreen.arrive = async () => {
      await act(async () => {
        replace(named);
      });
    };
    onScreen.visit = async (kind) => {
      await act(async () => {
        setNamed(kind);
        replace(kind);
      });
    };
    const props: ThemeShellProps = {
      pageKind: named,
      // The host says so in the commit that replaces the page.
      pageOnScreen: rendered.kind,
      options: resolveThemeOptions(theme, stored),
      navOptions,
      sidebarCards: cards ?? cardsFor(named),
      user,
      isSessionLoading,
      logout: async () => {},
      // As `PageFade` has it: the transition, the element it keys by the
      // page, the page.
      children: createElement(
        "div",
        { className: "fuwari-page-fade" },
        createElement(
          "div",
          null,
          createElement(Page, {
            key: rendered.serial,
            kind: rendered.kind,
            headers,
          }),
        ),
      ),
      footer: createElement("p", null, "Footer content"),
      floatingActions: createElement("button", { type: "button" }, "Floating"),
    };
    return createElement(
      FloatingActionsProvider,
      null,
      createElement(
        TocSlotProvider,
        null,
        createElement(theme.shell.Shell, props),
      ),
    );
  }
  const root = createRootRoute({
    beforeLoad: () => ({ siteConfig: resolveSiteConfig({ site }) }),
    loader: () => ({ currentYear: 2026 }),
    component: Host,
    // The test stands the shell at any address.
    notFoundComponent: () => null,
  });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await act(async () => {
    render(createElement(RouterProvider, { router }));
  });
  await screen.findByText("Page content");
  return router;
}

export function shell() {
  return document.querySelector<HTMLElement>('[data-theme-shell="sidebar"]')!;
}
export function rail() {
  return document.querySelector<HTMLElement>(".sidebar-rail")!;
}
export function railBody() {
  return rail().querySelector<HTMLElement>(".sidebar-rail-body")!;
}
export function railFoot() {
  return rail().querySelector<HTMLElement>(".sidebar-rail-foot")!;
}
export function topBar() {
  return document.querySelector<HTMLElement>(".sidebar-topbar")!;
}
export function banner() {
  return document.querySelector<HTMLElement>(".sidebar-banner");
}
export function headline() {
  return document.querySelector<HTMLElement>(".sidebar-headline");
}
export function region(name: string) {
  return document.querySelector<HTMLElement>(`[data-shell-region="${name}"]`)!;
}
export function cardSlots() {
  return [...document.querySelectorAll<HTMLElement>(".sidebar-card")];
}
export function mainNavigation() {
  return within(rail()).getByRole("navigation", { name: m.nav_main_label() });
}

export function follows(earlier: Node, later: Node) {
  return Boolean(
    earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
}
export function inOrder(nodes: Array<Node | null>) {
  expect(nodes.every(Boolean)).toBe(true);
  return nodes.every(
    (node, index) => index === 0 || follows(nodes[index - 1]!, node!),
  );
}

/** A file of the shell, as written. */
export function read(name: string) {
  return readFileSync(join(import.meta.dirname, name), "utf8");
}
/** A stylesheet of the shell without its comments. */
export function readCss(name: string) {
  return read(name).replace(/\/\*[\s\S]*?\*\//g, "");
}

/** The declarations of a block, one per entry, however they are wrapped. */
export function declarations(block: string) {
  return block
    .split(";")
    .map((declaration) =>
      declaration
        .replace(/\s+/g, " ")
        .replace(/\( /g, "(")
        .replace(/ \)/g, ")")
        .trim(),
    )
    .filter(Boolean);
}

/** The body of the first block that follows `head` in `css`. */
export function blockAfter(css: string, head: string) {
  const start = css.indexOf("{", css.indexOf(head));
  expect(css.indexOf(head), head).toBeGreaterThanOrEqual(0);
  let depth = 1;
  let end = start + 1;
  while (depth > 0) {
    if (css[end] === "{") depth += 1;
    if (css[end] === "}") depth -= 1;
    end += 1;
  }
  return css.slice(start + 1, end - 1);
}

/** The body of every `@media <query>` block in `css`. */
export function mediaBlocks(css: string, query: string) {
  const head = `@media ${query}`;
  const blocks: Array<string> = [];
  for (let at = css.indexOf(head); at >= 0; at = css.indexOf(head, at + 1)) {
    blocks.push(blockAfter(css.slice(at), head));
  }
  return blocks;
}

/** `css` with one line of spaces for every run of white space, as a selector is compared. */
export function flat(css: string) {
  return css.replace(/\s+/g, " ").replace(/\( /g, "(").replace(/ \)/g, ")");
}

/** The custom properties `css` gives the Theme's root, a later block winning. */
export function rootProperties(css: string) {
  const properties: Record<string, string> = {};
  for (const [, body] of css.matchAll(
    /:root\[data-theme="sidebar"\]\s*\{([^{}]*)\}/g,
  )) {
    for (const declaration of declarations(body!)) {
      const [, name, value] = declaration.match(/^(--[\w-]+):\s*(.+)$/) ?? [];
      if (name) properties[name] = value!;
    }
  }
  return properties;
}
