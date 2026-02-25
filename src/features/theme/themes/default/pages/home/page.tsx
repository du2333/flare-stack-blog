import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Github,
  Hash,
  Mail,
  Rss,
  Terminal,
} from "lucide-react";
import type { HomePageProps } from "@/features/theme/contract/pages";
import { blogConfig } from "@/blog.config";
import { PostItem } from "@/features/theme/themes/default/components/post-item";
import { formatDate } from "@/lib/utils";

export function HomePage({ posts, totalPosts, totalTags }: HomePageProps) {
  const latestDate = posts[0]?.publishedAt;

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto px-6 md:px-0 py-12 md:py-20 space-y-28">
      {/* ── Hero Section ── */}
      <section className="relative space-y-8">
        {/* Ambient decorative orbs */}
        <div
          className="pointer-events-none absolute -top-20 -left-32 w-72 h-72 rounded-full opacity-[0.035] dark:opacity-[0.06] blur-3xl"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)",
            animation:
              "ambient-float 12s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-10 -right-24 w-56 h-56 rounded-full opacity-[0.025] dark:opacity-[0.04] blur-3xl"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)",
            animation:
              "ambient-float 10s cubic-bezier(0.45, 0, 0.55, 1) 3s infinite alternate-reverse",
          }}
        />

        <header className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-foreground flex items-center gap-4">
            你好 <span className="animate-wave origin-[70%_70%]">👋</span>
          </h1>

          <div className="space-y-4 max-w-2xl text-base md:text-lg text-muted-foreground font-light leading-relaxed">
            <p>
              我是{" "}
              <span className="text-accent font-medium">
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
            className="hover:text-accent transition-all duration-[350ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-110 active:scale-95"
            aria-label="GitHub"
          >
            <Github size={20} strokeWidth={1.5} />
          </a>
          <a
            href="/rss.xml"
            target="_blank"
            className="hover:text-accent transition-all duration-[350ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-110 active:scale-95"
            rel="noreferrer"
            aria-label="RSS 订阅"
          >
            <Rss size={20} strokeWidth={1.5} />
          </a>
          <a
            href={`mailto:${blogConfig.social.email}`}
            className="hover:text-accent transition-all duration-[350ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-110 active:scale-95"
            aria-label="发送邮件"
          >
            <Mail size={20} strokeWidth={1.5} />
          </a>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="grid grid-cols-3 gap-6 py-6 px-8 rounded-2xl bg-card border border-border/50 shadow-sm shadow-accent/[0.04] backdrop-blur-sm">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <BookOpen
            size={16}
            strokeWidth={1.5}
            className="text-accent/70"
          />
          <span className="text-2xl font-serif font-medium text-foreground tabular-nums">
            {totalPosts}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/60">
            篇文章
          </span>
        </div>
        <div className="flex flex-col items-center gap-1.5 text-center border-x border-border/30">
          <Hash size={16} strokeWidth={1.5} className="text-accent/70" />
          <span className="text-2xl font-serif font-medium text-foreground tabular-nums">
            {totalTags}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/60">
            个标签
          </span>
        </div>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span className="text-accent/70 text-xs">✦</span>
          <span className="text-sm font-mono font-medium text-foreground">
            {latestDate ? formatDate(latestDate) : "—"}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/60">
            最近更新
          </span>
        </div>
      </section>

      {/* ── Recent Posts ── */}
      <section className="space-y-10">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-serif font-medium text-foreground tracking-tight whitespace-nowrap">
            最新文章
          </h2>
          <div className="flex-1 h-px bg-border/40" />
        </div>

        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id}>
              <PostItem post={post} />
            </div>
          ))}
        </div>

        <div className="pt-4">
          <Link
            to="/posts"
            className="text-sm font-mono text-muted-foreground hover:text-accent transition-all duration-[350ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] flex items-center gap-2 group"
          >
            <Terminal
              size={14}
              className="group-hover:translate-x-0.5 transition-transform duration-[350ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]"
            />
            cd /posts
          </Link>
        </div>
      </section>

      {/* ── Footer Motto ── */}
      <section className="relative py-12 flex flex-col items-center text-center">
        <div className="w-12 h-px bg-accent/30 mb-8" />
        <blockquote className="max-w-md font-serif text-lg md:text-xl italic text-muted-foreground/60 leading-relaxed">
          "代码与文字，皆是思想的延伸。"
        </blockquote>
        <div className="mt-6 text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground/30">
          — {blogConfig.author}
        </div>
      </section>
    </div>
  );
}
