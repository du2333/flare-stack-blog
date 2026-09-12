export function PostPageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="cuckoo-card-base my-5 h-67.5 md:h-[350px]" />
      <div className="cuckoo-card-base p-6">
        <div className="cuckoo-text-30 mb-4 h-5 w-3/4 rounded bg-current" />
        <div className="cuckoo-text-30 mb-3 h-4 w-full rounded bg-current" />
        <div className="cuckoo-text-30 h-4 w-2/3 rounded bg-current" />
      </div>
    </div>
  );
}
