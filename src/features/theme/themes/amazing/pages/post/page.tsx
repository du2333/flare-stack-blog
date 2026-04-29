import { Link } from "@tanstack/react-router";
import { Clock, FileText, Pencil } from "lucide-react";
import { Suspense } from "react";
import type { PostPageProps } from "@/features/theme/contract/pages";
import { FuwariCommentSection } from "@/features/theme/themes/fuwari/components/comments/view/comment-section";
import { ContentRenderer } from "@/features/theme/themes/fuwari/components/content/content-renderer";
import { authClient } from "@/lib/auth/auth.client";
import { m } from "@/paraglide/messages";
import { PostMeta } from "./components/post-meta";
import { PostSummary } from "./components/post-summary";
import { RelatedPosts, RelatedPostsSkeleton } from "./components/related-posts";
import TableOfContents from "./components/table-of-contents";

/**
 * Enhanced Post Detail Page — Amazing Theme
 *
 * Features:
 * - Title slides in from left with spring animation
 * - Meta area fades up with stagger
 * - Content area uses tilt-in perspective entrance
 * - TOC slides in from right on desktop
 * - End-of-content gradient line
 * - Staggered comment and related posts sections
 */
export function PostPage({ post }: PostPageProps) {
  const { data: session } = authClient.useSession();
  const wordCount = post.readTimeInMinutes * 300;

  return (
    <div className="relative flex flex-col rounded-(--fuwari-radius-large) py-1 md:py-0 md:bg-transparent gap-4 mb-4 w-full">
      {/* Table Of Contents (Desktop Floating Right) */}
      <div
        className="hidden 2xl:block absolute top-0 h-full pl-4"
        style={{
          right: "calc(var(--fuwari-toc-width) * -1)",
          width: "var(--fuwari-toc-width)",
        }}
      >
        <div
          className="fuwari-onload-animation"
          style={{
            animationName: "amazing-slide-in-right",
            animationDuration: "700ms",
            animationTimingFunction: "var(--amazing-spring)",
            animationDelay: "300ms",
          }}
        >
          <TableOfContents headers={post.toc} />
        </div>
      </div>

      {/* Main Post Container */}
      <div
        className="fuwari-card-base z-10 px-6 md:px-9 pt-6 pb-4 relative w-full fuwari-onload-animation"
        style={{
          animationName: "amazing-fade-up",
          animationDuration: "600ms",
          animationTimingFunction: "var(--amazing-spring)",
        }}
      >
        {/* Word count and reading time */}
        <div
          className="flex flex-row flex-wrap fuwari-text-30 gap-5 mb-3 transition fuwari-onload-animation"
          style={{ animationDelay: "100ms" }}
        >
          <div className="flex flex-row items-center">
            <div className="transition h-6 w-6 rounded-md bg-black/5 dark:bg-white/10 fuwari-text-50 flex items-center justify-center mr-2">
              <FileText strokeWidth={1.5} size={16} />
            </div>
            <div className="text-sm">
              {m.post_word_count({ count: wordCount })}
            </div>
          </div>
          <div className="flex flex-row items-center">
            <div className="transition h-6 w-6 rounded-md bg-black/5 dark:bg-white/10 fuwari-text-50 flex items-center justify-center mr-2">
              <Clock strokeWidth={1.5} size={16} />
            </div>
            <div className="text-sm">
              {m.read_time({ count: post.readTimeInMinutes })}
            </div>
          </div>
          {session?.user.role === "admin" && (
            <Link
              to="/admin/posts/edit/$id"
              params={{ id: String(post.id) }}
              className="flex flex-row items-center fuwari-text-30 hover:fuwari-text-90 transition animate-in fade-in duration-500"
            >
              <div className="transition h-6 w-6 rounded-md bg-black/5 dark:bg-white/10 fuwari-text-50 flex items-center justify-center mr-2">
                <Pencil strokeWidth={1.5} size={16} />
              </div>
              <div className="text-sm">{m.post_edit()}</div>
            </Link>
          )}
        </div>

        {/* Title with slide-in-left */}
        <div className="relative">
          <h1
            className="transition w-full block font-bold mb-3
              text-3xl md:text-[2.25rem]/[2.75rem]
              fuwari-text-90
              md:before:w-1 before:h-5 before:rounded-md before:bg-(--fuwari-primary)
              before:absolute before:top-3 before:-left-4.5
              fuwari-onload-animation"
            style={{
              viewTransitionName: `post-title-${post.slug}`,
              animationName: "amazing-slide-in-left",
              animationDuration: "600ms",
              animationTimingFunction: "var(--amazing-spring)",
              animationDelay: "50ms",
            }}
          >
            {post.title}
          </h1>
        </div>

        {/* Metadata */}
        <div
          className="fuwari-onload-animation"
          style={{ animationDelay: "150ms" }}
        >
          <PostMeta post={post} className="mb-5" />
        </div>

        {/* Summary */}
        <div
          className="fuwari-onload-animation"
          style={{ animationDelay: "200ms" }}
        >
          <PostSummary summary={post.summary} />
        </div>

        {/* Markdown Content with tilt-in entrance */}
        <div
          className="mb-6 prose dark:prose-invert prose-base max-w-none! fuwari-custom-md fuwari-onload-animation"
          style={{
            animationName: "amazing-tilt-in",
            animationDuration: "800ms",
            animationTimingFunction: "var(--amazing-smooth)",
            animationDelay: "250ms",
          }}
        >
          <ContentRenderer content={post.contentJson} />
        </div>

        {/* End of Content Notice */}
        <div className="my-8 flex items-center justify-center w-full">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-(--fuwari-primary)/20 to-transparent" />
          <span className="mx-4 text-sm font-mono tracking-widest text-(--fuwari-primary)/40 whitespace-nowrap">
            END
          </span>
          <div className="h-px w-full bg-gradient-to-r from-(--fuwari-primary)/20 via-transparent to-transparent" />
        </div>
      </div>

      {/* Related Posts */}
      <div
        className="fuwari-onload-animation"
        style={{
          animationDelay: "350ms",
          animationName: "amazing-fade-up",
          animationDuration: "600ms",
          animationTimingFunction: "var(--amazing-spring)",
        }}
      >
        <Suspense fallback={<RelatedPostsSkeleton />}>
          <RelatedPosts slug={post.slug} />
        </Suspense>
      </div>

      {/* Comments Section */}
      <div
        className="fuwari-card-base p-6 fuwari-onload-animation"
        style={{
          animationDelay: "450ms",
          animationName: "amazing-fade-up",
          animationDuration: "600ms",
          animationTimingFunction: "var(--amazing-spring)",
        }}
      >
        <FuwariCommentSection postId={post.id} />
      </div>
    </div>
  );
}
