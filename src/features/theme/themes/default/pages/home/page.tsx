import { Link } from "@tanstack/react-router";
import { Github, Mail, Rss, Terminal } from "lucide-react";
import type { HomePageProps } from "@/features/theme/contract/pages";
import { blogConfig } from "@/blog.config";
import { PostItem } from "@/features/theme/themes/default/components/post-item";

export function HomePage({ posts }: HomePageProps) {
  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto px-6 md:px-0 py-12 md:py-20 space-y-20">
      {/* Intro Section */}
      <section className="space-y-8">
        <header className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-foreground flex items-center gap-4">
            你好 <span className="animate-wave origin-[70%_70%]">👋</span>
          </h1>

          <div className="space-y-4 max-w-2xl text-base md:text-lg text-muted-foreground font-light leading-relaxed">
            <p>
              我是{" "}
              <span className="text-foreground font-medium">
                {blogConfig.author}
              </span>
              ，{blogConfig.description}
            </p>
          </div>
        </header>

        <div className="flex items-center gap-6 text-muted-foreground">
          <a
            href={blogConfig.social.github}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition-colors"
            aria-label="GitHub"
          >
            <Github size={20} strokeWidth={1.5} />
          </a>
          <a
            href="/rss.xml"
            target="_blank"
            className="hover:text-foreground transition-colors"
            rel="noreferrer"
            aria-label="RSS 订阅"
          >
            <Rss size={20} strokeWidth={1.5} />
          </a>
          <a
            href={`mailto:${blogConfig.social.email}`}
            className="hover:text-foreground transition-colors"
            aria-label="发送邮件"
          >
            <Mail size={20} strokeWidth={1.5} />
          </a>
        </div>
      </section>

      {/* Selected Posts */}
      <section className="space-y-10">
        <h2 className="text-xl font-serif font-medium text-foreground tracking-tight flex items-center gap-2">
          最新文章
        </h2>

        <div className="space-y-8">
          {posts.map((post) => (
            <PostItem key={post.id} post={post} />
          ))}
        </div>

        <div className="pt-8">
          <Link
            to="/posts"
            className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <Terminal size={14} />
            cd /posts
          </Link>
        </div>
      </section>
    </div>
  );
}
