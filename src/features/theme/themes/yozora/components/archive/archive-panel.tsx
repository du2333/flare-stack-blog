import type { PostItem } from "@/features/posts/schema/posts.schema";
import { ArchivePost } from "./archive-post";
import { ArchiveYear } from "./archive-year";

interface ArchivePanelProps {
  posts: Array<PostItem>;
}

/**
 * 目录页：一本书的 Contents——年份作章标（细线 + 页码区间），
 * 条目与首页共用 yz-tocline 语言（页边码 p.NNN + 点线 + 衬线标题）。
 */
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

  // 全局页边码：跨年份连续编号（p.001 起）
  let pageNo = 0;

  return (
    <div className="yz-contents yz-archive">
      {years.map((year) => {
        const yearPosts = groupedPosts[year];
        const first = pageNo + 1;
        pageNo += yearPosts.length;
        const last = pageNo;
        return (
          <section key={year}>
            <ArchiveYear
              year={year}
              count={yearPosts.length}
              range={`${String(first).padStart(3, "0")}–${String(last).padStart(3, "0")}`}
            />
            {yearPosts.map((post, i) => (
              <ArchivePost key={post.id} post={post} pageNo={first + i} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
