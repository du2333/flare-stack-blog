export function SettingsInnerSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-56 rounded-2xl bg-(--fuwari-btn-regular-bg)" />
      <div className="h-32 rounded-2xl bg-(--fuwari-btn-regular-bg)" />
    </div>
  );
}

export function SettingsPageSkeleton({ chips = true }: { chips?: boolean }) {
  return (
    <div
      className="fuwari-card-base p-5 md:p-6 space-y-6 animate-pulse fuwari-onload-animation"
      style={{ animationDelay: "var(--fuwari-content-delay)" }}
    >
      <div className="hidden lg:flex justify-between items-center">
        <div className="h-8 w-24 rounded-lg bg-(--fuwari-btn-regular-bg)" />
        <div className="h-10 w-16 rounded-xl bg-(--fuwari-btn-regular-bg)" />
      </div>
      {chips ? (
        <div className="flex gap-2">
          <div className="h-9 w-14 rounded-xl bg-(--fuwari-btn-regular-bg)" />
          <div className="h-9 w-14 rounded-xl bg-(--fuwari-btn-regular-bg)" />
          <div className="h-9 w-20 rounded-xl bg-(--fuwari-btn-regular-bg)" />
          <div className="h-9 w-14 rounded-xl bg-(--fuwari-btn-regular-bg)" />
        </div>
      ) : null}
      <div className="h-56 rounded-2xl bg-(--fuwari-btn-regular-bg)" />
      <div className="h-32 rounded-2xl bg-(--fuwari-btn-regular-bg)" />
    </div>
  );
}
