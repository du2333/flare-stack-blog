// @vitest-environment jsdom
import {
  createElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ExpandableSidebarCard } from "@/components/layout/expandable-sidebar-card";
import { Profile } from "@/components/layout/profile";
import { FriendLinksPage } from "@/features/friend-links/components/friend-links-page";
import { LatestMoments } from "@/features/moments/components/latest-moments";
import { MomentsPage } from "@/features/moments/components/moments-page";
import { MomentPageSkeleton } from "@/features/moments/components/moments-page-skeleton";
import { ArchivePanel } from "@/features/posts/components/archive/archive-panel";
import { HomePage } from "@/features/posts/components/home-page";
import { PostCard } from "@/features/posts/components/post-card";
import { PostMeta } from "@/features/posts/components/post-meta";
import { PostPage } from "@/features/posts/components/post-page";
import { PostPageSkeleton } from "@/features/posts/components/post-page-skeleton";
import { PostSummary } from "@/features/posts/components/post-summary";
import { PostsPage } from "@/features/posts/components/posts-page";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import { m } from "@/paraglide/messages";
import { DEFAULT_THEME_RECIPE, type ThemeRecipe } from "../theme-recipe";
import { ThemeRecipeProvider } from "./theme-recipe";
import { ThemedPageHeading } from "./themed-page-heading";

const state = vi.hoisted(() => ({ cached: undefined as unknown }));

vi.mock("@tanstack/react-router", async () => ({
  ...(await vi.importActual("@tanstack/react-router")),
  useParams: () => ({ slug: "a-post" }),
  useRouteContext: () => ({
    siteConfig: {
      avatar: "/avatar.png",
      author: "Author",
      description: "",
      social: [],
    },
  }),
  Link: ({
    children,
    to,
    params,
    search: _search,
    ...rest
  }: {
    children: ReactNode;
    to: string;
    params?: Record<string, string>;
    search?: unknown;
  }) =>
    createElement(
      "a",
      { href: to.replace("$slug", params?.slug ?? "$slug"), ...rest },
      children,
    ),
}));
vi.mock("@tanstack/react-query", async () => ({
  ...(await vi.importActual("@tanstack/react-query")),
  useQueryClient: () => ({}),
  useSuspenseQuery: () => ({
    data: [
      {
        id: 1,
        text: "A moment",
        images: [],
        video: null,
        postedAt: new Date("2026-01-02T00:00:00Z"),
        updatedAt: new Date("2026-01-02T00:00:00Z"),
        commentCount: 0,
      },
    ],
  }),
}));
vi.mock("@/features/posts/utils/cached-public-post", () => ({
  findCachedPublicPost: () => state.cached,
}));
vi.mock("@/lib/auth/auth-client", () => ({
  useSession: () => ({ data: null }),
}));
vi.mock("@/features/comments/components/comment-section", () => ({
  CommentSection: () => null,
}));
vi.mock("@/features/posts/components/post-adjacent-nav", () => ({
  PostAdjacentNav: () => null,
}));
// The card has a test of its own; here it only marks an entry of the timeline.
vi.mock("@/features/moments/components/moment-card", () => ({
  MomentCard: () => createElement("article"),
}));
vi.mock("@/features/posts/components/table-of-contents", () => ({
  default: () => null,
}));
vi.mock("@/features/posts/components/content/content-renderer", () => ({
  ContentRenderer: () => null,
}));
vi.mock("@/features/posts/components/content/photo-swipe", () => ({
  usePhotoSwipeGallery: () => {},
}));
vi.mock("@/paraglide/runtime", async () => ({
  ...(await vi.importActual("@/paraglide/runtime")),
  getLocale: () => "en",
}));

function post(overrides: Partial<PostItem> = {}): PostItem {
  return {
    id: 1,
    title: "A post",
    slug: "a-post",
    summary: "What the post is about.",
    tags: [
      { id: 1, name: "one" },
      { id: 2, name: "two" },
    ],
    category: { id: 1, name: "Notes" },
    cover: null,
    publishedAt: new Date("2026-03-01T10:00:00Z"),
    updatedAt: new Date("2026-03-02T10:00:00Z"),
    readTimeInMinutes: 4,
    viewCount: 12,
    pinnedAt: null,
    contentJson: null,
    toc: [],
    ...overrides,
  } as unknown as PostItem;
}
const COVER = { url: "/images/cover.png", width: 1200, height: 600 };
const READ_TIME = m.read_time({ count: 4 });
const VIEWS = m.post_views_count({ count: 12 });

/** Server-renders under a recipe that differs from the default by `forms`. */
function render(element: ReactElement, forms: Partial<ThemeRecipe> = {}) {
  const host = document.createElement("div");
  host.innerHTML = renderToString(
    createElement(ThemeRecipeProvider, {
      recipe: { ...DEFAULT_THEME_RECIPE, ...forms },
      children: element,
    }),
  );
  return host;
}

function postPage(forms: Partial<ThemeRecipe> = {}) {
  const page = post() as unknown as ComponentProps<typeof PostPage>["post"];
  return render(
    createElement(PostPage, { post: page, canonicalHref: "/" }),
    forms,
  );
}

function linksTo(host: Element, href: string) {
  return [...host.querySelectorAll("a")].filter(
    (link) => link.getAttribute("href") === href,
  );
}

/** The innermost element whose text includes `text`. */
function byText(host: Element, text: string) {
  return [...host.querySelectorAll("*")]
    .reverse()
    .find((element) => element.textContent?.includes(text))!;
}

/** Whether a title draws the accent bar (a ::before utility on it). */
function hasBar(title: Element) {
  return /\bbefore:/.test(title.className);
}

describe("Theme Recipe", () => {
  it("defaults to today's look, also outside a provider", () => {
    expect(DEFAULT_THEME_RECIPE).toEqual({
      postCard: "card",
      meta: "chips",
      noCoverStrip: "keep",
      headingAccent: "on",
      summary: "box",
      archive: "timeline",
    });
    const element = createElement(PostCard, { post: post() });
    const bare = document.createElement("div");
    bare.innerHTML = renderToString(element);
    expect(render(element).innerHTML).toBe(bare.innerHTML);
  });

  describe("post card", () => {
    it("card: meta before the summary, stats after it, a chevron after the title", () => {
      const host = render(createElement(PostCard, { post: post() }));
      const [title] = linksTo(host, "/post/a-post");
      expect(title.querySelector("svg")).not.toBeNull();
      const card = host.firstElementChild!;
      const text = card.firstElementChild!;
      const parts = [...text.children];
      const summary = parts.findIndex((part) =>
        part.textContent?.includes("What the post is about."),
      );
      expect(parts[summary - 1].textContent).toContain("Notes");
      expect(parts[summary + 1].textContent).toContain(READ_TIME);
    });

    it("card: keeps an empty summary in place", () => {
      const host = render(
        createElement(PostCard, { post: post({ summary: null }) }),
      );
      const text = host.firstElementChild!.firstElementChild!;
      expect(text.children).toHaveLength(4);
    });

    it("row: title, summary, then one meta line with the stats; no chevron", () => {
      const host = render(createElement(PostCard, { post: post() }), {
        postCard: "row",
      });
      const [title] = linksTo(host, "/post/a-post");
      expect(title.querySelector("svg")).toBeNull();
      const parts = [...title.parentElement!.children];
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe(title);
      expect(parts[1].textContent).toBe("What the post is about.");
      const meta = parts[2];
      for (const text of ["Notes", "one", "two", READ_TIME, VIEWS]) {
        expect(meta.textContent).toContain(text);
      }
    });

    it("row: a missing summary takes no space", () => {
      const host = render(
        createElement(PostCard, { post: post({ summary: null }) }),
        { postCard: "row" },
      );
      const [title] = linksTo(host, "/post/a-post");
      expect(title.parentElement!.children).toHaveLength(2);
      expect(title.nextElementSibling!.textContent).toContain(READ_TIME);
    });

    it("row: the cover is an image after the text, and there is never a strip", () => {
      const withCover = render(
        createElement(PostCard, {
          post: post({ cover: COVER } as Partial<PostItem>),
        }),
        { postCard: "row" },
      );
      // React hoists a preload link for the image ahead of the row.
      const row = withCover.querySelector(":scope > div")!;
      expect(row.children).toHaveLength(2);
      expect(row.lastElementChild!.querySelector("img")).not.toBeNull();

      const withoutCover = render(createElement(PostCard, { post: post() }), {
        postCard: "row",
      });
      expect(linksTo(withoutCover, "/post/a-post")).toHaveLength(1);
    });

    it("home list: cards get a separator for phones, rows do not", () => {
      const posts = [post(), post({ slug: "b" }), post({ slug: "c" })];
      const props = { posts, page: 1, totalPages: 1 };
      const list = (host: Element) => [
        ...host.firstElementChild!.firstElementChild!.children,
      ];

      const cards = list(render(createElement(HomePage, props)));
      expect(cards.map((entry) => entry.children.length)).toEqual([2, 2, 1]);
      const rows = list(
        render(createElement(HomePage, props), { postCard: "row" }),
      );
      expect(rows.map((entry) => entry.children.length)).toEqual([1, 1, 1]);
    });
  });

  describe("Moments timeline", () => {
    const moments = [1, 2, 3].map((id) => ({
      id,
      text: "A moment",
      images: [],
      video: null,
      postedAt: new Date("2026-01-02T00:00:00Z"),
      updatedAt: new Date("2026-01-02T00:00:00Z"),
      commentCount: 0,
    }));
    const ruled = (forms?: Partial<ThemeRecipe>) =>
      [
        ...render(
          createElement(MomentsPage, { moments, page: 1, totalPages: 1 }),
          forms,
        ).querySelectorAll("article"),
      ].map((entry) =>
        entry.parentElement!.classList.contains("fuwari-list-rule"),
      );
    const surface = (forms?: Partial<ThemeRecipe>) =>
      render(
        createElement(MomentPageSkeleton),
        forms,
      ).firstElementChild!.classList.contains("fuwari-card-item");

    it("card: Moments stand apart, each on its own surface", () => {
      expect(ruled()).toEqual([false, false, false]);
      expect(surface()).toBe(true);
    });

    it("row: Moments sit on the page with a rule between them", () => {
      expect(ruled({ postCard: "row" })).toEqual([false, true, true]);
      expect(surface({ postCard: "row" })).toBe(false);
    });
  });

  describe("meta", () => {
    it("chips: every item is led by an icon", () => {
      expect(
        render(createElement(PostMeta, { post: post() })).querySelectorAll(
          "svg",
        ),
      ).toHaveLength(4);
      const card = render(createElement(PostCard, { post: post() }));
      expect(byText(card, READ_TIME).querySelector("svg")).not.toBeNull();
    });

    it("inline: plain text, no icons in the meta, the stats or the word count line", () => {
      const meta = render(createElement(PostMeta, { post: post() }), {
        meta: "inline",
      });
      expect(meta.querySelectorAll("svg")).toHaveLength(0);
      expect(meta.textContent).toContain("Notes");

      const card = render(createElement(PostCard, { post: post() }), {
        meta: "inline",
        noCoverStrip: "remove",
      });
      expect(card.querySelectorAll("svg")).toHaveLength(2); // the title's chevrons
      expect(card.textContent).toContain(READ_TIME);

      const row = render(createElement(PostCard, { post: post() }), {
        postCard: "row",
        meta: "inline",
      });
      expect(row.querySelectorAll("svg")).toHaveLength(0);

      const page = postPage({ meta: "inline" });
      const words = byText(page, m.post_word_count({ count: 1200 }));
      expect(words.parentElement!.parentElement!.querySelector("svg")).toBe(
        null,
      );
    });

    it("chips and inline: the post page skeleton follows the recipe", () => {
      // No summary, whose box has an icon of its own.
      state.cached = post({ summary: null });
      const chips = render(createElement(PostPageSkeleton));
      const inline = render(createElement(PostPageSkeleton), {
        meta: "inline",
      });
      expect(chips.querySelectorAll("svg").length).toBeGreaterThan(0);
      expect(inline.querySelectorAll("svg")).toHaveLength(0);

      state.cached = undefined;
      const placeholders = (host: Element) =>
        host.querySelectorAll('div[aria-hidden="true"]').length;
      expect(placeholders(render(createElement(PostPageSkeleton)))).toBe(
        placeholders(
          render(createElement(PostPageSkeleton), { meta: "inline" }),
        ) + 5,
      );
    });
  });

  describe("no-cover strip", () => {
    it("keep: a card without a cover has a second way into the post", () => {
      const host = render(createElement(PostCard, { post: post() }));
      const links = linksTo(host, "/post/a-post");
      expect(links).toHaveLength(2);
      expect(links[1].querySelector("img")).toBeNull();
    });

    it("remove: the title is the only way in", () => {
      const host = render(createElement(PostCard, { post: post() }), {
        noCoverStrip: "remove",
      });
      expect(linksTo(host, "/post/a-post")).toHaveLength(1);
      const covered = render(
        createElement(PostCard, {
          post: post({ cover: COVER } as Partial<PostItem>),
        }),
        { noCoverStrip: "remove" },
      );
      expect(covered.querySelector("img")).not.toBeNull();
    });
  });

  describe("heading accent", () => {
    const sidebar = createElement(ExpandableSidebarCard, {
      title: "Tags",
      collapsed: false,
      onExpand: () => {},
      children: "x",
    });
    const heading = createElement(ThemedPageHeading, {
      title: "Profile",
      back: { to: "/", label: "Back" },
      description: "Intro",
    });

    it.each([
      ["on", true],
      ["off", false],
    ] as const)("%s", (headingAccent, bar) => {
      const forms = { headingAccent };
      const [cardTitle] = linksTo(
        render(createElement(PostCard, { post: post() }), forms),
        "/post/a-post",
      );
      expect(hasBar(cardTitle)).toBe(bar);
      const [rowTitle] = linksTo(
        render(createElement(PostCard, { post: post() }), {
          ...forms,
          postCard: "row",
        }),
        "/post/a-post",
      );
      expect(hasBar(rowTitle)).toBe(bar);

      const page = postPage(forms);
      expect(hasBar(page.querySelector("h1")!)).toBe(bar);
      state.cached = post();
      const skeleton = render(createElement(PostPageSkeleton), forms);
      expect(hasBar(skeleton.querySelector("h1")!)).toBe(bar);

      const card = render(sidebar, forms);
      expect(byText(card, "Tags").firstElementChild?.tagName === "SPAN").toBe(
        bar,
      );
      const moments = render(createElement(LatestMoments), forms);
      expect(
        byText(moments, m.moments_latest_title()).parentElement!
          .firstElementChild!.tagName,
      ).toBe(bar ? "SPAN" : "A");

      // The short line under the author's name.
      const profile = render(createElement(Profile), forms);
      expect(
        profile.querySelector('div[style*="--theme-accent"]') !== null,
      ).toBe(bar);

      const friends = render(
        createElement(FriendLinksPage, { links: [] }),
        forms,
      );
      expect(friends.querySelector("header")!.dataset.accent).toBe(
        bar ? undefined : "off",
      );
      expect(
        render(heading, forms).querySelector("header")!.dataset.accent,
      ).toBe(bar ? undefined : "off");
    });
  });

  describe("summary", () => {
    it("box: an icon and a label over the summary", () => {
      const host = render(createElement(PostSummary, { summary: "Lead" }));
      expect(host.querySelector("svg")).not.toBeNull();
      expect(host.querySelector("h3")!.textContent).toBe(
        m.post_summary_title(),
      );
    });

    it("standfirst: the summary alone, as a paragraph", () => {
      const host = render(createElement(PostSummary, { summary: "Lead" }), {
        summary: "standfirst",
      });
      expect(host.children).toHaveLength(1);
      expect(host.firstElementChild!.tagName).toBe("P");
      expect(host.textContent).toBe("Lead");
    });

    it("either: nothing without a summary, and the skeleton follows the recipe", () => {
      expect(
        render(createElement(PostSummary, { summary: null }), {
          summary: "standfirst",
        }).innerHTML,
      ).toBe("");
      state.cached = post();
      const skeleton = render(createElement(PostPageSkeleton), {
        summary: "standfirst",
      });
      expect(skeleton.querySelector("h3")).toBeNull();
      expect(byText(skeleton, "What the post is about.").tagName).toBe("P");
    });
  });

  describe("archive", () => {
    const posts = [
      post(),
      post({ slug: "b", publishedAt: new Date("2025-06-01T00:00:00Z") }),
    ];

    it("timeline: years are not headings, entries carry the axis", () => {
      const host = render(createElement(ArchivePanel, { posts }));
      expect(host.querySelectorAll("h2")).toHaveLength(0);
      const [entry] = linksTo(host, "/post/a-post");
      expect(entry.firstElementChild!.children).toHaveLength(4);
    });

    it("index: a heading per year over its entries of date, title and Tags", () => {
      const host = render(createElement(ArchivePanel, { posts }), {
        archive: "index",
      });
      expect(
        [...host.querySelectorAll("h2")].map((year) => year.textContent),
      ).toEqual(["2026", "2025"]);
      const [entry] = linksTo(host, "/post/a-post");
      expect([...entry.children].map((part) => part.tagName)).toEqual([
        "TIME",
        "SPAN",
        "SPAN",
      ]);
      expect(entry.textContent).toContain("#one #two");
    });

    it("index: the entries loading next take the same form", () => {
      const props = {
        posts,
        tags: [],
        onTagClick: () => {},
        hasNextPage: true,
        isFetchingNextPage: true,
        fetchNextPage: () => {},
      };
      const loading = (host: Element) =>
        [...host.querySelectorAll("div")].find((element) =>
          element.className.includes("opacity-70"),
        )!;
      const timeline = loading(render(createElement(PostsPage, props)));
      const index = loading(
        render(createElement(PostsPage, props), { archive: "index" }),
      );
      expect(timeline.children).toHaveLength(3);
      expect(index.children).toHaveLength(3);
      expect(timeline.firstElementChild!.children).toHaveLength(3);
      expect(index.firstElementChild!.children).toHaveLength(2);
    });
  });
});
