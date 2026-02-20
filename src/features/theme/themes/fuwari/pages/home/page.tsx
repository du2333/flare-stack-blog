import { Link } from "@tanstack/react-router";
import { PostCard } from "../../components/post-card";
import type { HomePageProps } from "@/features/theme/contract/pages";

export function HomePage({ posts }: HomePageProps) {
  return (
    <div className="fuwari-onload-animation flex flex-col rounded-(--fuwari-radius-large) bg-(--fuwari-card-bg) py-1 md:py-0 md:bg-transparent md:gap-4">
      {posts.map((post, i) => (
        <div
          key={post.id}
          className="fuwari-onload-animation"
          style={{
            animationDelay: `calc(var(--fuwari-content-delay) + ${i * 50}ms)`,
          }}
        >
          <PostCard post={post} />
          <div className="border-t border-dashed mx-6 border-black/10 dark:border-white/15 last:border-t-0 md:hidden" />
        </div>
      ))}
      <div
        className="fuwari-onload-animation"
        style={{
          animationDelay: `calc(var(--fuwari-content-delay) + ${posts.length * 50}ms)`,
        }}
      >
        <Link
          to="/posts"
          className="fuwari-btn-regular mx-6 rounded-lg h-10 px-6 mt-4 flex items-center justify-center mb-4 md:mb-0 md:mx-auto"
        >
          查看全部文章
        </Link>
      </div>
    </div>
  );
}
