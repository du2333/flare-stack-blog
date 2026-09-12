export function PostsPageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="cuckoo-card-base mb-2 h-14" />
      {[1, 2].map((i) => (
        <div key={i} className="cuckoo-card-base my-5 h-[230px] md:h-[350px]" />
      ))}
    </div>
  );
}
