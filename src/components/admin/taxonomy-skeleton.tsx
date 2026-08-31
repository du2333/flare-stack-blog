export function TaxonomySkeleton() {
  return (
    <div
      className="fuwari-card-base p-5 md:p-6 space-y-6 animate-pulse fuwari-onload-animation"
      style={{ animationDelay: "var(--fuwari-content-delay)" }}
    >
      <div className="hidden lg:block h-8 w-36 rounded-lg bg-(--fuwari-btn-regular-bg)" />
      <div className="grid gap-8 lg:grid-cols-2 items-start">
        <CategoryPanelSkeleton />
        <div className="lg:border-l lg:border-(--fuwari-input-border) lg:pl-8">
          <TagPanelSkeleton />
        </div>
      </div>
    </div>
  );
}

export function CategoryPanelSkeleton() {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <div className="h-4 w-12 rounded-lg bg-(--fuwari-btn-regular-bg)" />
        <div className="h-3 w-10 rounded-lg bg-(--fuwari-btn-regular-bg)" />
      </div>
      <div className="flex gap-2">
        <div className="flex-1 h-10 rounded-xl bg-(--fuwari-btn-regular-bg)" />
        <div className="h-10 w-16 rounded-xl bg-(--fuwari-btn-regular-bg)" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <div className="h-4 w-4 rounded bg-(--fuwari-btn-regular-bg)" />
          <div className="h-4 flex-1 rounded-lg bg-(--fuwari-btn-regular-bg)" />
          <div className="h-3 w-10 rounded-lg bg-(--fuwari-btn-regular-bg)" />
        </div>
      ))}
    </section>
  );
}

export function TagPanelSkeleton() {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <div className="h-4 w-12 rounded-lg bg-(--fuwari-btn-regular-bg)" />
        <div className="h-3 w-16 rounded-lg bg-(--fuwari-btn-regular-bg)" />
      </div>
      <div className="h-10 w-full rounded-xl bg-(--fuwari-btn-regular-bg)" />
      <div className="flex flex-wrap gap-2 pt-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-9 rounded-full bg-(--fuwari-btn-regular-bg)"
            style={{ width: `${72 + ((i * 17) % 48)}px` }}
          />
        ))}
      </div>
    </section>
  );
}
