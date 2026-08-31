import { cn, formatBytes } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export function MediaToolbar({
  unusedOnly,
  onUnusedOnlyChange,
  unusedCount,
  totalCount,
  totalBytes,
  onDeleteUnused,
}: {
  unusedOnly: boolean;
  onUnusedOnlyChange: (val: boolean) => void;
  unusedCount: number;
  totalCount: number;
  totalBytes: number;
  onDeleteUnused: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onUnusedOnlyChange(false)}
        className={cn(
          "rounded-xl h-9 px-3 text-sm font-medium",
          unusedOnly ? "fuwari-btn-regular" : "fuwari-btn-primary",
        )}
      >
        {m.media_filter_all()}
      </button>
      <button
        type="button"
        onClick={() => onUnusedOnlyChange(true)}
        className={cn(
          "rounded-xl h-9 px-3 text-sm font-medium gap-1.5",
          unusedOnly
            ? "bg-(--fuwari-warning) text-(--fuwari-warning-fg)"
            : "bg-(--fuwari-warning-bg) text-(--fuwari-warning-fg)",
        )}
      >
        {m.media_filter_unused()}
        <span className="min-w-4 text-xs">{unusedCount}</span>
      </button>

      {unusedOnly && unusedCount > 0 ? (
        <button
          type="button"
          onClick={onDeleteUnused}
          className="h-9 px-2 text-sm font-medium text-(--fuwari-danger-fg)"
        >
          {m.media_delete_all_unused()}
        </button>
      ) : null}

      <span className="sm:ml-auto text-sm fuwari-text-50">
        {m.media_stats({
          count: totalCount,
          size: formatBytes(totalBytes),
        })}
      </span>
    </div>
  );
}
