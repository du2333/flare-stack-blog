import { Link } from "@tanstack/react-router";
import { PostCard } from "../../components/post-card";
import type { HomePageProps } from "@/features/theme/contract/pages";

export function HomePage({ posts }: HomePageProps) {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="cuckoo-card p-6 md:p-8 cuckoo-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold cuckoo-text-primary mb-2">
          欢迎访问我的博客
        </h1>
        <p className="cuckoo-text-secondary">记录技术成长，分享学习心得</p>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {posts.map((post, index) => (
          <div
            key={post.id}
            className="cuckoo-slide-up"
            style={{
              animationDelay: `${index * 100}ms`,
              animationFillMode: "both",
            }}
          >
            <PostCard post={post} />
          </div>
        ))}
      </div>

      {/* View All Posts Button */}
      {posts.length > 0 && (
        <div className="text-center pt-4">
          <Link to="/posts" className="cuckoo-btn cuckoo-btn-primary px-8 py-3">
            查看全部文章
          </Link>
        </div>
      )}
    </div>
  );
}
