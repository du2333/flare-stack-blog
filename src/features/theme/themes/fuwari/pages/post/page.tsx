import { Clock, FileText } from "lucide-react";
import { Suspense } from "react";
import TableOfContents from "./components/table-of-contents";
import { RelatedPosts, RelatedPostsSkeleton } from "./components/related-posts";
import { PostMeta } from "./components/post-meta";
import { PostSummary } from "./components/post-summary";
import type { PostPageProps } from "@/features/theme/contract/pages";
import { ContentRenderer } from "@/features/theme/themes/fuwari/components/content/content-renderer";
import { FuwariCommentSection } from "@/features/theme/themes/fuwari/components/comments/view/comment-section";

export function PostPage({ post }: PostPageProps) {
  // Approximate word count
  const wordCount = post.readTimeInMinutes * 300;

  return (
    <div className="relative flex flex-col rounded-(--fuwari-radius-large) py-1 md:py-0 md:bg-transparent gap-4 mb-4 w-full">
      {/* Table Of Contents (Desktop Floating Right) */}
      <div className="hidden xl:block absolute left-full ml-10 top-0 h-full w-(--fuwari-toc-width,18rem)">
        <TableOfContents headers={post.toc} />
      </div>

      {/* Main Post Container */}
      <div className="fuwari-card-base z-10 px-6 md:px-9 pt-6 pb-4 relative w-full fuwari-onload-animation">
        {/* Word count and reading time */}
        <div className="flex flex-row fuwari-text-30 gap-5 mb-3 transition">
          <div className="flex flex-row items-center">
            <div className="transition h-6 w-6 rounded-md bg-black/5 dark:bg-white/10 fuwari-text-50 flex items-center justify-center mr-2">
              <FileText strokeWidth={1.5} size={16} />
            </div>
            <div className="text-sm">约 {wordCount} 字</div>
          </div>
          <div className="flex flex-row items-center">
            <div className="transition h-6 w-6 rounded-md bg-black/5 dark:bg-white/10 fuwari-text-50 flex items-center justify-center mr-2">
              <Clock strokeWidth={1.5} size={16} />
            </div>
            <div className="text-sm">{post.readTimeInMinutes} 分钟</div>
          </div>
        </div>

        {/* Title */}
        <div className="relative">
          <h1
            className="transition w-full block font-bold mb-3
              text-3xl md:text-[2.25rem]/[2.75rem]
              fuwari-text-90
              md:before:w-1 before:h-5 before:rounded-md before:bg-(--fuwari-primary)
              before:absolute before:top-3 before:-left-4.5"
            style={{ viewTransitionName: `post-title-${post.slug}` }}
          >
            {post.title}
          </h1>
        </div>

        {/* Metadata */}
        <div>
          <PostMeta post={post} className="mb-5" />
        </div>

        {/* Summary */}
        <PostSummary summary={post.summary} />

        {/* Markdown Content */}
        <div className="mb-6 prose dark:prose-invert prose-base max-w-none! fuwari-custom-md">
          <ContentRenderer content={post.contentJson} />
        </div>

        {/* End of Content Notice */}
        <div className="my-8 flex items-center justify-center w-full">
          <div className="h-px w-full bg-linear-to-r from-transparent via-(--fuwari-meta-divider) to-transparent opacity-20" />
          <span className="mx-4 text-sm font-mono tracking-widest text-(--fuwari-meta-divider) opacity-50 whitespace-nowrap">
            END
          </span>
          <div className="h-px w-full bg-linear-to-r from-(--fuwari-meta-divider) via-transparent to-transparent opacity-20" />
        </div>
      </div>

      {/* Prev/Next buttons (Mock implementation for layout, actual data would come from the server in an ideal setup) */}
      <div
        className="hidden flex-col md:flex-row justify-between gap-4 overflow-hidden w-full fuwari-onload-animation"
        style={{ animationDelay: "150ms" }}
      >
        {/* Note: the backend schema doesn't currently provide prev/next slugs in PostWithToc. Using placeholder layouts to match Fuwari exactly. */}
      </div>

      {/* Related Posts */}
      <Suspense fallback={<RelatedPostsSkeleton />}>
        <RelatedPosts slug={post.slug} />
      </Suspense>

      {/* Comments Section */}
      <div
        className="fuwari-card-base p-6 fuwari-onload-animation"
        style={{ animationDelay: "450ms" }}
      >
        <FuwariCommentSection postId={post.id} />
      </div>
    </div>
  );
}
