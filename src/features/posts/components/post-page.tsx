import { Link } from "@tanstack/react-router";
import { Clock, FileText, Pencil } from "lucide-react";
import { Suspense } from "react";
import { CommentSection } from "@/features/comments/components/comment-section";
import { ContentRenderer } from "@/features/posts/components/content/content-renderer";
import type { PostWithToc } from "@/features/posts/schema/posts.schema";
import { authClient } from "@/lib/auth/auth.client";
import { m } from "@/paraglide/messages";
import ZoomableImage from "./content/zoomable-image";
import { PostMeta } from "./post-meta";
import { PostSummary } from "./post-summary";
import { RelatedPosts, RelatedPostsSkeleton } from "./related-posts";
import TableOfContents from "./table-of-contents";

interface PostPageProps {
  post: Exclude<PostWithToc, null>;
}

export function PostPage({ post }: PostPageProps) {
  const { data: session } = authClient.useSession();
  // Approximate word count
  const wordCount = post.readTimeInMinutes * 300;

  return (
    <div className="relative flex flex-col rounded-(--fuwari-radius-large) py-1 md:py-0 md:bg-transparent gap-4 mb-4 w-full">
      <TableOfContents headers={post.toc} />

      {/* Main Post Container */}
      <div className="fuwari-card-base z-10 px-6 md:px-9 pt-6 pb-4 relative w-full">
        {/* Word count and reading time */}
        <div
          className="flex flex-row flex-wrap fuwari-text-30 gap-5 mb-3 transition fuwari-onload-animation"
          style={{ animationDelay: "calc(var(--fuwari-content-delay) + 0ms)" }}
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

        {/* Title */}
        <div
          className="relative fuwari-onload-animation"
          style={{ animationDelay: "calc(var(--fuwari-content-delay) + 50ms)" }}
        >
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
        <div
          className="fuwari-onload-animation"
          style={{
            animationDelay: "calc(var(--fuwari-content-delay) + 100ms)",
          }}
        >
          <PostMeta post={post} className="mb-5" />
          {!post.cover && (
            <div className="border-(--fuwari-meta-divider) border-dashed border-b mb-5" />
          )}
        </div>

        {post.cover && (
          <div
            id="post-cover"
            className="mb-8 rounded-xl overflow-hidden fuwari-onload-animation"
            style={{
              animationDelay: "calc(var(--fuwari-content-delay) + 175ms)",
            }}
          >
            <ZoomableImage
              src={post.cover.url}
              alt={post.title}
              width={post.cover.width ?? undefined}
              height={post.cover.height ?? undefined}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {/* Summary */}
        <PostSummary summary={post.summary} />

        {/* Markdown Content */}
        <div
          className="fuwari-onload-animation"
          style={{
            animationDelay: "calc(var(--fuwari-content-delay) + 325ms)",
          }}
        >
          <div className="mb-6 prose dark:prose-invert prose-base max-w-none! fuwari-custom-md">
            <ContentRenderer content={post.contentJson} />
          </div>
          <div className="my-8 flex items-center justify-center w-full">
            <div className="h-px w-full bg-linear-to-r from-transparent via-(--fuwari-meta-divider) to-transparent opacity-20" />
            <span className="mx-4 text-sm font-mono tracking-widest text-(--fuwari-meta-divider) opacity-50 whitespace-nowrap">
              END
            </span>
            <div className="h-px w-full bg-linear-to-r from-(--fuwari-meta-divider) via-transparent to-transparent opacity-20" />
          </div>
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
        style={{ animationDelay: "calc(var(--fuwari-content-delay) + 450ms)" }}
      >
        <CommentSection postId={post.id} />
      </div>
    </div>
  );
}
