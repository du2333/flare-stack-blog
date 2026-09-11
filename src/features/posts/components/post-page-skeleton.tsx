import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { Clock, FileText } from "lucide-react";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";
import { findCachedPublicPost } from "@/features/posts/utils/cached-public-post";
import { m } from "@/paraglide/messages";
import { cn } from "@/lib/utils";
import { PostMeta } from "./post-meta";
import { PostSummary } from "./post-summary";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-md bg-black/[0.06] dark:bg-white/10", className)}
    />
  );
}

function MetaChip() {
  return (
    <div className="flex items-center">
      <Bone className="mr-2 h-6 w-6 rounded-md" />
      <Bone className="h-3.5 w-16" />
    </div>
  );
}

function Paragraph({ widths }: { widths: Array<string> }) {
  return (
    <div className="space-y-3">
      {widths.map((width, index) => (
        <Bone key={`${width}-${index}`} className={cn("h-3.5", width)} />
      ))}
    </div>
  );
}

function ArticleBodySkeleton() {
  return (
    <div className="animate-pulse">
      <Paragraph
        widths={["w-full", "w-full", "w-full", "w-[96%]", "w-[88%]"]}
      />
      <Bone className="mt-8 mb-4 h-6 w-2/5" />
      <Paragraph widths={["w-full", "w-full", "w-full", "w-full", "w-[72%]"]} />
      <Bone className="my-8 h-36 w-full rounded-xl" />
      <Bone className="mt-8 mb-4 h-6 w-1/3" />
      <Paragraph
        widths={["w-full", "w-full", "w-full", "w-[94%]", "w-[81%]"]}
      />
      <div className="mt-6">
        <Paragraph widths={["w-full", "w-full", "w-[90%]", "w-[64%]"]} />
      </div>
    </div>
  );
}

export function PostPageSkeleton() {
  const { slug } = useParams({ strict: false });
  const queryClient = useQueryClient();
  const cached =
    typeof slug === "string"
      ? findCachedPublicPost(queryClient, slug)
      : undefined;
  const wordCount = cached ? cached.readTimeInMinutes * 300 : 0;

  return (
    <div className="relative mb-4 flex w-full flex-col gap-4 rounded-(--fuwari-radius-large) py-1 md:bg-transparent md:py-0">
      <div className="fuwari-card-base relative z-10 w-full px-6 pb-4 pt-6 md:px-9">
        <div className="mb-3 flex flex-row flex-wrap gap-5 fuwari-text-30">
          {cached ? (
            <>
              <div className="flex flex-row items-center">
                <div className="mr-2 flex h-6 w-6 items-center justify-center rounded-md bg-black/5 fuwari-text-50 dark:bg-white/10">
                  <FileText strokeWidth={1.5} size={16} />
                </div>
                <div className="text-sm">
                  {m.post_word_count({ count: wordCount })}
                </div>
              </div>
              <div className="flex flex-row items-center">
                <div className="mr-2 flex h-6 w-6 items-center justify-center rounded-md bg-black/5 fuwari-text-50 dark:bg-white/10">
                  <Clock strokeWidth={1.5} size={16} />
                </div>
                <div className="text-sm">
                  {m.read_time({ count: cached.readTimeInMinutes })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex animate-pulse gap-5">
              <MetaChip />
              <MetaChip />
            </div>
          )}
        </div>

        <div className="relative">
          {cached ? (
            <h1
              className="relative mb-3 block w-full text-3xl font-bold fuwari-text-90 md:text-[2.25rem]/[2.75rem] md:before:absolute md:before:top-3 md:before:-left-4.5 md:before:h-5 md:before:w-1 md:before:rounded-md md:before:bg-(--fuwari-primary)"
              style={
                typeof slug === "string"
                  ? { viewTransitionName: `post-title-${slug}` }
                  : undefined
              }
            >
              {cached.title}
            </h1>
          ) : (
            <div className="mb-3 animate-pulse">
              <Bone className="h-9 w-4/5 md:h-10" />
            </div>
          )}
        </div>

        {cached ? (
          <>
            <PostMeta post={cached} className="mb-5" />
            {!cached.cover && (
              <div className="mb-5 border-b border-dashed border-(--fuwari-meta-divider)" />
            )}
          </>
        ) : (
          <div className="mb-5 flex animate-pulse flex-wrap gap-4">
            <MetaChip />
            <MetaChip />
            <MetaChip />
          </div>
        )}

        {cached?.cover ? (
          <div className="mb-8 overflow-hidden rounded-xl">
            <img
              src={getPublicImageSrc(
                cached.cover.url,
                PUBLIC_IMAGE_WIDTH.cover,
              )}
              alt={cached.title}
              width={cached.cover.width ?? undefined}
              height={cached.cover.height ?? undefined}
              className="h-auto w-full object-cover"
            />
          </div>
        ) : null}

        {cached?.summary ? <PostSummary summary={cached.summary} /> : null}

        <div className="mb-6">
          <ArticleBodySkeleton />
        </div>

        <div className="my-8 flex w-full items-center justify-center">
          <div className="h-px w-full bg-linear-to-r from-transparent via-(--fuwari-meta-divider) to-transparent opacity-20" />
          <span className="mx-4 whitespace-nowrap font-mono text-sm tracking-widest text-(--fuwari-meta-divider) opacity-50">
            END
          </span>
          <div className="h-px w-full bg-linear-to-r from-(--fuwari-meta-divider) via-transparent to-transparent opacity-20" />
        </div>
      </div>

      <div className="fuwari-card-base animate-pulse p-6">
        <Bone className="mb-5 h-5 w-24" />
        <div className="space-y-4">
          <Bone className="h-16 w-full rounded-xl" />
          <Bone className="h-16 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
