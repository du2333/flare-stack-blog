import { FriendLinkSkeleton } from "./friend-link-skeleton";

export function FriendLinksPageSkeleton() {
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

      {/* Loading Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <FriendLinkSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
