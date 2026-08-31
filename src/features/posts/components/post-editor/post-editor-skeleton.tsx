export function PostEditorSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 lg:flex-row">
      <section className="fuwari-card-base flex min-h-0 flex-1 animate-pulse flex-col overflow-hidden p-5 md:p-8">
        <div className="mb-6 flex justify-between">
          <div className="h-4 w-20 rounded-lg bg-(--fuwari-btn-regular-bg)" />
          <div className="h-9 w-16 rounded-xl bg-(--fuwari-btn-regular-bg)" />
        </div>
        <div className="mb-6 h-8 w-2/3 rounded-lg bg-(--fuwari-btn-regular-bg)" />
        <div className="space-y-3">
          <div className="h-4 w-full rounded-lg bg-(--fuwari-btn-regular-bg)/70" />
          <div className="h-4 w-5/6 rounded-lg bg-(--fuwari-btn-regular-bg)/70" />
          <div className="h-4 w-2/3 rounded-lg bg-(--fuwari-btn-regular-bg)/70" />
        </div>
      </section>
      <aside className="hidden min-h-0 w-80 shrink-0 animate-pulse flex-col overflow-hidden rounded-[1rem] bg-(--fuwari-card-bg) p-5 lg:flex">
        <div className="mb-5 aspect-video rounded-2xl bg-(--fuwari-btn-regular-bg)" />
        <div className="mb-3 h-4 w-12 rounded bg-(--fuwari-btn-regular-bg)" />
        <div className="mb-5 h-10 rounded-xl bg-(--fuwari-btn-regular-bg)" />
        <div className="mb-3 h-4 w-12 rounded bg-(--fuwari-btn-regular-bg)" />
        <div className="h-10 rounded-xl bg-(--fuwari-btn-regular-bg)" />
      </aside>
    </div>
  );
}
