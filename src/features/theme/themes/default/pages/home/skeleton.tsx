import { BookOpen, Github, Hash, Mail, Rss, Terminal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { blogConfig } from "@/blog.config";

export function HomePageSkeleton() {
  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto px-6 md:px-0 py-12 md:py-20 space-y-28">
      {/* Hero Section */}
      <section className="space-y-8">
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

        <div className="flex items-center gap-6 text-muted-foreground opacity-50 pointer-events-none">
          <Github size={20} strokeWidth={1.5} />
          <Rss size={20} strokeWidth={1.5} />
          <Mail size={20} strokeWidth={1.5} />
        </div>
      </section>

      {/* Stats Bar Skeleton */}
      <section className="grid grid-cols-3 gap-6 py-6 px-8 rounded-2xl bg-card border border-border/50 shadow-sm shadow-accent/[0.04]">
        <div className="flex flex-col items-center gap-1.5">
          <BookOpen size={16} strokeWidth={1.5} className="text-accent/40" />
          <Skeleton className="h-7 w-8 rounded-sm" />
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/40">篇文章</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 border-x border-border/30">
          <Hash size={16} strokeWidth={1.5} className="text-accent/40" />
          <Skeleton className="h-7 w-8 rounded-sm" />
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/40">个标签</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-accent/40 text-xs">✦</span>
          <Skeleton className="h-5 w-20 rounded-sm" />
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/40">最近更新</span>
        </div>
      </section>

      {/* Recent Posts Skeleton */}
      <section className="space-y-10">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-serif font-medium text-foreground tracking-tight whitespace-nowrap">最新文章</h2>
          <div className="flex-1 h-px bg-border/40" />
        </div>

        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="py-8 md:py-10 px-5 -mx-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 text-xs font-mono tracking-wider">
                  <Skeleton className="h-4 w-24 rounded-sm" />
                  <span className="opacity-30">/</span>
                  <Skeleton className="h-4 w-16 rounded-sm" />
                </div>
                <Skeleton className="h-8 md:h-10 w-3/4 rounded-sm my-1" />
                <div className="space-y-2 mt-1">
                  <Skeleton className="h-4 w-full rounded-sm" />
                  <Skeleton className="h-4 w-5/6 rounded-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 opacity-50">
          <div className="text-sm font-mono text-muted-foreground flex items-center gap-2">
            <Terminal size={14} />
            cd /posts
          </div>
        </div>
      </section>
    </div>
  );
}
