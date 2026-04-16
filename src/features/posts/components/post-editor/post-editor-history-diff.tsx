import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { PostRevisionSnapshot } from "@/features/posts/schema/post-revisions.schema";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import {
  buildContentDiffLines,
  buildRevisionFieldDiffs,
  type DiffLine,
  type RevisionFieldKey,
} from "./post-editor-history-diff.utils";

interface PostEditorHistoryDiffProps {
  previousSnapshot: PostRevisionSnapshot;
  currentSnapshot: PostRevisionSnapshot;
  allTags: Array<{ id: number; name: string }>;
}

function DiffLineNumber({
  value,
  type,
}: {
  value: number | null;
  type: "context" | "added" | "removed";
}) {
  return (
    <div
      className={cn(
        "select-none px-3 py-1 text-right font-mono text-xs tabular-nums",
        type === "context" && "text-muted-foreground/55",
        type === "added" && "text-emerald-700 dark:text-emerald-400",
        type === "removed" && "text-rose-700 dark:text-rose-400",
      )}
    >
      {value ?? ""}
    </div>
  );
}

function DiffMarker({ type }: { type: "context" | "added" | "removed" }) {
  let marker = "";

  if (type === "added") {
    marker = "+";
  } else if (type === "removed") {
    marker = "-";
  }

  return (
    <div
      className={cn(
        "px-2 py-1 text-center font-mono text-xs select-none",
        type === "context" && "text-muted-foreground/35",
        type === "added" && "text-emerald-700 dark:text-emerald-400",
        type === "removed" && "text-rose-700 dark:text-rose-400",
      )}
    >
      {marker}
    </div>
  );
}

function getFieldLabel(field: RevisionFieldKey) {
  switch (field) {
    case "title":
      return m.editor_history_diff_field_title();
    case "summary":
      return m.editor_history_diff_field_summary();
    case "slug":
      return m.editor_history_diff_field_slug();
    case "status":
      return m.editor_history_diff_field_status();
    case "publishedAt":
      return m.editor_history_diff_field_published_at();
    case "readTime":
      return m.editor_history_diff_field_read_time();
    case "tags":
      return m.editor_history_diff_field_tags();
  }
}

function renderDiffTokens(line: DiffLine) {
  if (line.tokens.length === 0) {
    return <span className="text-muted-foreground/60"> </span>;
  }

  return line.tokens.map((token, tokenIndex) => (
    <span
      key={`${token.type}:${tokenIndex}:${token.value}`}
      className={cn(
        token.type === "context" && "text-foreground/88",
        token.type === "added" &&
          "bg-emerald-500/18 text-emerald-950 dark:text-emerald-100",
        token.type === "removed" &&
          "bg-rose-500/18 text-rose-950 dark:text-rose-100",
      )}
    >
      {token.value}
    </span>
  ));
}

function getLineRowClass(type: DiffLine["type"]) {
  return cn(
    "grid grid-cols-[2.5rem_4.5rem_4.5rem_minmax(0,1fr)] border-b border-border/30 last:border-b-0",
    type === "context" && "bg-transparent",
    type === "added" && "bg-emerald-500/7 dark:bg-emerald-500/10",
    type === "removed" && "bg-rose-500/7 dark:bg-rose-500/10",
  );
}

export function PostEditorHistoryDiff({
  previousSnapshot,
  currentSnapshot,
  allTags,
}: PostEditorHistoryDiffProps) {
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);

  const lines = useMemo(
    () =>
      buildContentDiffLines(
        previousSnapshot.contentJson,
        currentSnapshot.contentJson,
      ),
    [currentSnapshot.contentJson, previousSnapshot.contentJson],
  );

  const fieldDiffs = useMemo(
    () => buildRevisionFieldDiffs(previousSnapshot, currentSnapshot, allTags),
    [allTags, currentSnapshot, previousSnapshot],
  );

  const hasContentChanges = lines.some((line) => line.type !== "context");
  const visibleLines = showOnlyChanges
    ? lines.filter((line) => line.type !== "context")
    : lines;

  let contentChangesSection = (
    <div className="border border-border/50 bg-muted/15 px-4 py-3 text-sm text-muted-foreground/75">
      {m.editor_history_diff_no_content_changes()}
    </div>
  );

  if (hasContentChanges) {
    contentChangesSection = (
      <div className="overflow-hidden border border-border/50 bg-card/60">
        <div className="font-mono text-[13px] leading-6">
          {visibleLines.map((line, index) => (
            <div
              key={`${line.type}:${line.oldLineNumber}:${line.newLineNumber}:${index}`}
              className={getLineRowClass(line.type)}
            >
              <DiffMarker type={line.type} />
              <DiffLineNumber value={line.oldLineNumber} type={line.type} />
              <DiffLineNumber value={line.newLineNumber} type={line.type} />
              <div className="overflow-x-auto px-3 py-1 whitespace-pre-wrap wrap-break-word">
                {renderDiffTokens(line)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground/75">
              {m.editor_history_diff_title()}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground/70">
              {m.editor_history_diff_subtitle()}
            </p>
          </div>
        </div>

        {fieldDiffs.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {fieldDiffs.map((field) => (
              <div
                key={field.field}
                className="border border-border/50 bg-muted/15 p-4"
              >
                <p className="mb-3 text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground/70">
                  {getFieldLabel(field.field)}
                </p>
                <div className="space-y-2 text-sm leading-6">
                  <div className="border border-rose-500/25 bg-rose-500/8 px-3 py-2 text-rose-900 dark:text-rose-100">
                    {field.previousValue}
                  </div>
                  <div className="border border-emerald-500/25 bg-emerald-500/8 px-3 py-2 text-emerald-900 dark:text-emerald-100">
                    {field.currentValue}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-border/50 bg-muted/15 px-4 py-3 text-sm text-muted-foreground/75">
            {m.editor_history_diff_no_metadata_changes()}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground/75">
              {m.editor_history_diff_content_title()}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground/70">
              {m.editor_history_diff_content_subtitle()}
            </p>
          </div>

          <label className="inline-flex items-center gap-2 border border-border/40 bg-muted/15 px-3 py-2 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground/80">
            <Checkbox
              checked={showOnlyChanges}
              onCheckedChange={setShowOnlyChanges}
              aria-label={m.editor_history_diff_toggle_changes()}
            />
            {m.editor_history_diff_toggle_changes()}
          </label>
        </div>

        {contentChangesSection}
      </section>
    </div>
  );
}
