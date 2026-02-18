import { Github, Mail, Rss, Terminal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { blogConfig } from "@/blog.config";

export function HomePageSkeleton() {
  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto px-6 md:px-0 py-12 md:py-20 space-y-20">
      {/* Intro Section - Static Text Retained */}
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

        <div className="flex items-center gap-6 text-muted-foreground opacity-50 pointer-events-none">
          <Github size={20} strokeWidth={1.5} />
          <Rss size={20} strokeWidth={1.5} />
          <Mail size={20} strokeWidth={1.5} />
        </div>
      </section>

      {/* Selected Posts Skeleton */}
      <section className="space-y-10">
        <h2 className="text-xl font-serif font-medium text-foreground tracking-tight flex items-center gap-2">
          最新文章
        </h2>

        <div className="space-y-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="group border-b border-border/40 last:border-0"
            >
              <div className="block py-8 md:py-10">
                <div className="flex flex-col gap-3">
                  {/* Metadata Row Skeleton */}
                  <div className="flex items-center gap-3 text-xs font-mono tracking-wider">
                    <Skeleton className="h-4 w-24 bg-muted/60 rounded-none" />
                    <span className="opacity-30">/</span>
                    <div className="flex gap-2">
                      <Skeleton className="h-4 w-16 bg-muted/60 rounded-none" />
                      <Skeleton className="h-4 w-20 bg-muted/60 rounded-none" />
                    </div>
                  </div>

                  {/* Title Skeleton */}
                  <Skeleton className="h-8 md:h-10 w-3/4 bg-muted/80 rounded-none my-1" />

                  {/* Summary Skeleton */}
                  <div className="space-y-2 mt-1">
                    <Skeleton className="h-4 w-full bg-muted/40 rounded-none" />
                    <Skeleton className="h-4 w-5/6 bg-muted/40 rounded-none" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-8 opacity-50">
          <div className="text-sm font-mono text-muted-foreground flex items-center gap-2">
            <Terminal size={14} />
            cd /posts
          </div>
        </div>
      </section>
    </div>
  );
}
