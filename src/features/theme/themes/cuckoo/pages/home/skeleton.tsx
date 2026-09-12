export function HomePageSkeleton() {
  return (
    <div className="animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="cuckoo-card-base my-5 h-[230px] md:h-[350px]" />
      ))}
    </div>
  );
}
