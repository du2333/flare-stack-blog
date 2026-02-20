import { ArchivePost } from "./archive-post";
import { ArchiveYear } from "./archive-year";
import type { PostItem } from "@/features/posts/posts.schema";

interface ArchivePanelProps {
  posts: Array<PostItem>;
}

export function ArchivePanel({ posts }: ArchivePanelProps) {
  const groupedPosts = posts.reduce(
    (acc, post) => {
      const year = new Date(post.publishedAt || "").getFullYear();
      acc[year] ??= [];
      acc[year].push(post);
      return acc;
    },
    {} as Record<number, Array<PostItem>>,
  );

  const years = Object.keys(groupedPosts)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="fuwari-card-base px-8 py-6">
      {years.map((year) => (
        <div key={year}>
          <ArchiveYear year={year} count={groupedPosts[year].length} />
          {groupedPosts[year].map((post) => (
            <ArchivePost key={post.id} post={post} />
          ))}
        </div>
      ))}
    </div>
  );
}
