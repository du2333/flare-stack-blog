export function FriendLinksPageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="cuckoo-card-base mb-5 h-28" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="cuckoo-card-base h-[115px]" />
        ))}
      </div>
    </div>
  );
}
