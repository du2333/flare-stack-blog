interface ArchiveYearProps {
  year: number;
  count: number;
  /** 该年份的页码区间，如 "001–006" */
  range: string;
}

/** 年份章标：细线 + 衬线年份 + 页码区间（书的目录分章） */
export function ArchiveYear({ year, count, range }: ArchiveYearProps) {
  return (
    <div className="yz-yearmark" role="heading" aria-level={2}>
      <span className="yz-yearmark__year">{year}</span>
      <span className="yz-yearmark__rule" aria-hidden="true" />
      <span className="yz-yearmark__meta">
        p.{range} · {count} entries
      </span>
    </div>
  );
}
