import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { FriendLinkCard } from "./friend-link-card";
import type { FriendLinksPageProps } from "@/features/theme/contract/pages";

export function FriendLinksPage({ links }: FriendLinksPageProps) {
  return (
    <div className="w-full max-w-3xl mx-auto pb-20 px-6 md:px-0">
      {/* Header */}
      <header className="py-12 md:py-20 space-y-6">
        <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-foreground">
          友情链接
        </h1>
        <p className="max-w-xl text-base md:text-lg font-light text-muted-foreground leading-relaxed">
          志同道合的站点，彼此链接，互相照亮。
        </p>
      </header>

      {/* Links List */}
      <div className="min-h-50">
        {links.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-serif text-lg text-muted-foreground/50">
              暂无友链
            </p>
            <p className="mt-2 text-sm text-muted-foreground/30 font-mono">
              // 成为第一个链接的站点
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {links.map((link) => (
              <FriendLinkCard key={link.id} link={link} />
            ))}
          </div>
        )}
      </div>

      {/* Submit CTA */}
      <div className="mt-20 pt-10 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-foreground">加入我们</h3>
          <p className="text-sm text-muted-foreground font-light">
            欢迎提交您的站点信息，通过审核后将在此展示。
          </p>
        </div>

        <Link
          to="/submit-friend-link"
          className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
        >
          <span>申请加入</span>
          <ArrowUpRight
            size={14}
            className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform"
          />
        </Link>
      </div>
    </div>
  );
}
