import { Suspense } from "react";
import { Profile } from "@/components/layout/profile";
import {
  Categories,
  CategoriesSkeleton,
} from "@/features/categories/components/category-cloud";
import { LatestMoments } from "@/features/moments/components/latest-moments";
import { Tags, TagsSkeleton } from "@/features/tags/components/tag-cloud";
import type { PageKind, SidebarCard, ThemeShell } from "../theme-shell";

/**
 * The sidebar cards of a page, in order. The list depends on the page kind
 * only, apart from identity cards, so the cache tags of each page stay true
 * whichever shell is in use: the home page carries the Moments tag because
 * it lists the latest Moments. A Post's page has the cards of an inner page.
 */
export function sidebarCardsFor(
  pageKind: PageKind,
  shell: Pick<ThemeShell, "identityInFirstScreen">,
): Array<SidebarCard> {
  if (pageKind === "focused") return [];
  const cards: Array<SidebarCard> = [];
  if (!shell.identityInFirstScreen.includes(pageKind)) {
    cards.push({ id: "profile", kind: "identity", content: <Profile /> });
  }
  if (pageKind === "home") {
    cards.push({
      id: "latest-moments",
      kind: "feed",
      content: (
        <Suspense fallback={null}>
          <LatestMoments />
        </Suspense>
      ),
    });
  }
  cards.push(
    {
      id: "categories",
      kind: "index",
      content: (
        <Suspense fallback={<CategoriesSkeleton />}>
          <Categories />
        </Suspense>
      ),
    },
    {
      id: "tags",
      kind: "index",
      content: (
        <Suspense fallback={<TagsSkeleton />}>
          <Tags />
        </Suspense>
      ),
    },
  );
  return cards;
}
