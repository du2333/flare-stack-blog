import { describe, expect, it } from "vitest";
import { THEME_SHELLS } from "../shells";
import { resolvePageKind } from "../utils/page-kind";
import { sidebarCardsFor } from "./sidebar-cards";

const page = (
  pathname: string,
  more: Partial<Parameters<typeof resolvePageKind>[0]> = {},
) =>
  resolvePageKind({
    pathname,
    isAuthRoute: false,
    hasRouteError: false,
    ...more,
  });

describe("resolvePageKind", () => {
  it("tells the home page from inner pages", () => {
    expect(page("/")).toBe("home");
    expect(page("/posts")).toBe("inner");
    expect(page("/post/hello")).toBe("inner");
    expect(page("/moments")).toBe("inner");
  });

  it("focuses sign-in, profile, the friend-link form and failed routes", () => {
    expect(page("/login", { isAuthRoute: true })).toBe("focused");
    expect(page("/profile")).toBe("focused");
    expect(page("/submit-friend-link")).toBe("focused");
    expect(page("/missing", { hasRouteError: true })).toBe("focused");
    expect(page("/", { hasRouteError: true })).toBe("focused");
  });
});

const ids = (cards: ReturnType<typeof sidebarCardsFor>) =>
  cards.map((card) => `${card.id}:${card.kind}`);

describe("sidebarCardsFor", () => {
  const none = { identityInFirstScreen: [] };

  it("adds the latest Moments on the home page only", () => {
    expect(ids(sidebarCardsFor("home", none))).toEqual([
      "profile:identity",
      "latest-moments:feed",
      "categories:index",
      "tags:index",
    ]);
    expect(ids(sidebarCardsFor("inner", none))).toEqual([
      "profile:identity",
      "categories:index",
      "tags:index",
    ]);
  });

  it("leaves identity cards out where the shell's first screen shows the identity", () => {
    const shell = { identityInFirstScreen: ["home"] as const };
    expect(ids(sidebarCardsFor("home", shell))).toEqual([
      "latest-moments:feed",
      "categories:index",
      "tags:index",
    ]);
    expect(ids(sidebarCardsFor("inner", shell))[0]).toBe("profile:identity");
  });

  it.each(THEME_SHELLS.map((shell) => [shell.id, shell] as const))(
    "gives the %s shell the same cards apart from identity cards, and none on a focused page",
    (_, shell) => {
      expect(sidebarCardsFor("focused", shell)).toEqual([]);
      for (const kind of ["home", "inner"] as const) {
        const withoutIdentity = (cards: ReturnType<typeof sidebarCardsFor>) =>
          ids(cards.filter((card) => card.kind !== "identity"));
        expect(withoutIdentity(sidebarCardsFor(kind, shell))).toEqual(
          withoutIdentity(sidebarCardsFor(kind, none)),
        );
      }
    },
  );
});
