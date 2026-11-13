import type { PostItem } from "@/features/posts/schema/posts.schema";
import { useThemeRecipe } from "@/features/theme/components/theme-recipe";
import { ArchivePost } from "./archive-post";
import { ArchiveYear } from "./archive-year";

interface ArchivePanelProps {
  posts: Array<PostItem>;
}

export function ArchivePanel({ posts }: ArchivePanelProps) {
  const groupedPosts = posts.reduce(
    (acc, post) => {
      if (!post.publishedAt) {
        return acc;
      }

      const year = new Date(post.publishedAt).getUTCFullYear();
      acc[year] ??= [];
      acc[year].push(post);
      return acc;
    },
    {} as Record<number, Array<PostItem>>,
  );

  const years = Object.keys(groupedPosts)
    .map(Number)
    .sort((a, b) => b - a);

  // The timeline runs on from year to year; the other forms set the years
  // apart.
  const archive = useThemeRecipe().archive;
  const index = archive !== "timeline";

  return (
    <div className="fuwari-card-base fuwari-card-panel px-[var(--theme-panel-pad-x,2rem)] py-6">
      {years.map((year) => (
        <div key={year} className={index ? "not-first:mt-10" : undefined}>
          <ArchiveYear year={year} count={groupedPosts[year].length} />
          {/* Rows led by a cover stand two abreast where there is room. */}
          <div
            className={
              archive === "covers" ? "fuwari-archive-covers" : undefined
            }
          >
            {groupedPosts[year].map((post) => (
              <ArchivePost key={post.id} post={post} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
