interface ArchiveYearProps {
  year: number;
  count: number;
}

export function ArchiveYear({ year, count }: ArchiveYearProps) {
  return (
    <div className="flex flex-row w-full items-center h-[3.75rem]">
      <div className="w-[15%] md:w-[10%] transition text-2xl font-bold text-right fuwari-text-75">
        {year}
      </div>
      <div className="w-[15%] md:w-[10%]">
        <div
          className="h-3 w-3 bg-none rounded-full outline outline-[var(--fuwari-primary)] mx-auto
          -outline-offset-[2px] z-50 outline-3"
        />
      </div>
      <div className="w-[70%] md:w-[80%] transition text-left fuwari-text-50">
        {count} 篇文章
      </div>
    </div>
  );
}
