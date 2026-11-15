import { useQuery } from "@tanstack/react-query";
import { ArrowRight, GitCompareArrows, ImageIcon } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { categoryOptionsQuery } from "@/features/categories/queries";
import { tagsAdminQueryOptions } from "@/features/tags/queries";
import { cn, formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import {
  collapseRows,
  type DiffRow,
  diffMarkdown,
  type FieldChange,
  type FieldKey,
  type FieldValue,
  fieldChanges,
  hasBodyChange,
} from "./post-diff.logic";
import type { PostDiffSide } from "./post-diff.types";
import { useCoverUrls } from "./use-cover-urls";
import "./post-diff.css";

export type { PostDiffSide } from "./post-diff.types";

export interface PostDiffProps {
  /** The older state, shown as removed. */
  before: PostDiffSide;
  /** The newer state, shown as added. */
  after: PostDiffSide;
  /** What the legend calls each side, without quotes: 此版本, 当前草稿. */
  beforeName: string;
  afterName: string;
  /** Shown when the two sides are equal in every field and the body. */
  emptyText: string;
  className?: string;
}

function fieldLabel(field: FieldKey) {
  switch (field) {
    case "title":
      return m.editor_diff_field_title();
    case "summary":
      return m.editor_diff_field_summary();
    case "slug":
      return m.editor_diff_field_slug();
    case "publishedAt":
      return m.editor_diff_field_published_at();
    case "category":
      return m.editor_diff_field_category();
    case "tags":
      return m.editor_diff_field_tags();
    case "cover":
      return m.editor_diff_field_cover();
    default:
      field satisfies never;
      return "";
  }
}

function Muted({ children }: { children: string }) {
  return <span className="post-diff-muted">{children}</span>;
}

function DeletedBadge() {
  return (
    <Badge tone="danger" size="sm">
      {m.editor_diff_value_deleted()}
    </Badge>
  );
}

function FieldValueView({
  field,
  value,
}: {
  field: FieldKey;
  value: FieldValue;
}) {
  switch (value.kind) {
    case "text": {
      if (field === "title") {
        return <span>{value.text || m.common_untitled()}</span>;
      }
      if (value.text === "") return <Muted>{m.editor_diff_value_empty()}</Muted>;
      return (
        <span className={field === "slug" ? "post-diff-mono" : undefined}>
          {value.text}
        </span>
      );
    }
    case "date":
      return value.time === null ? (
        <Muted>{m.editor_diff_value_empty()}</Muted>
      ) : (
        <span>{formatDate(new Date(value.time))}</span>
      );
    case "category":
      if (value.category === null) {
        return <Muted>{m.editor_meta_uncategorized()}</Muted>;
      }
      return value.category.name === null ? (
        <DeletedBadge />
      ) : (
        <Badge size="sm">{value.category.name}</Badge>
      );
    case "tags":
      if (value.tags.length === 0) {
        return <Muted>{m.editor_meta_tags_empty()}</Muted>;
      }
      return (
        <span className="post-diff-chips">
          {value.tags.map((tag) =>
            tag.name === null ? (
              <DeletedBadge key={tag.id} />
            ) : (
              <Badge key={tag.id} size="sm">
                {tag.name}
              </Badge>
            ),
          )}
        </span>
      );
    case "cover":
      if (value.id === null) return <Muted>{m.editor_meta_cover_empty()}</Muted>;
      return value.url ? (
        <img src={value.url} alt="" className="post-diff-cover" />
      ) : (
        <span className="post-diff-cover post-diff-cover-missing">
          <ImageIcon size={16} strokeWidth={1.5} aria-hidden="true" />
          {m.editor_diff_cover_unavailable()}
        </span>
      );
    default:
      value satisfies never;
      return null;
  }
}

function FieldChanges({ changes }: { changes: ReadonlyArray<FieldChange> }) {
  return (
    <section className="post-diff-section">
      <h3 className="post-diff-heading">{m.editor_diff_fields_title()}</h3>
      <dl className="post-diff-fields">
        {changes.map((change) => (
          <Fragment key={change.field}>
            <dt>{fieldLabel(change.field)}</dt>
            <dd>
              <span className="post-diff-value" data-side="before">
                <FieldValueView field={change.field} value={change.before} />
              </span>
              <ArrowRight
                size={14}
                className="post-diff-arrow"
                aria-hidden="true"
              />
              <span className="post-diff-value" data-side="after">
                <FieldValueView field={change.field} value={change.after} />
              </span>
            </dd>
          </Fragment>
        ))}
      </dl>
    </section>
  );
}

function RowText({ row }: { row: DiffRow }) {
  if (row.segments === null) return <>{row.text}</>;
  return (
    <>
      {row.segments.map((segment, index) =>
        segment.changed ? (
          <mark key={index} className="post-diff-mark">
            {segment.text}
          </mark>
        ) : (
          <Fragment key={index}>{segment.text}</Fragment>
        ),
      )}
    </>
  );
}

const NO_FOLDS: ReadonlySet<number> = new Set();

function BodyDiff({ rows }: { rows: ReadonlyArray<DiffRow> }) {
  // The folds the reader opened belong to these rows; other rows start folded.
  const [opened, setOpened] = useState<{
    rows: ReadonlyArray<DiffRow>;
    starts: ReadonlySet<number>;
  }>({ rows, starts: new Set() });
  const expanded = opened.rows === rows ? opened.starts : NO_FOLDS;
  const items = useMemo(
    () => collapseRows(rows, { expanded }),
    [rows, expanded],
  );

  return (
    <section className="post-diff-section">
      <h3 className="post-diff-heading">{m.editor_diff_body_title()}</h3>
      <div className="post-diff-body">
        {items.map((item) =>
          item.type === "fold" ? (
            <div key={`fold-${item.start}`} className="post-diff-fold">
              <Button
                variant="plain"
                size="sm"
                onClick={() =>
                  setOpened({
                    rows,
                    starts: new Set([...expanded, item.start]),
                  })
                }
              >
                {m.editor_diff_fold_expand({ count: item.count })}
              </Button>
            </div>
          ) : (
            <div
              key={item.index}
              className="post-diff-row"
              data-kind={item.row.kind}
            >
              <span className="post-diff-gutter" aria-hidden="true">
                {item.row.kind === "removed"
                  ? "−"
                  : item.row.kind === "added"
                    ? "+"
                    : ""}
              </span>
              <span className="post-diff-text">
                {item.row.kind === "removed" ? (
                  <span className="sr-only">{m.editor_diff_row_removed()} </span>
                ) : item.row.kind === "added" ? (
                  <span className="sr-only">{m.editor_diff_row_added()} </span>
                ) : null}
                <RowText row={item.row} />
              </span>
            </div>
          ),
        )}
      </div>
    </section>
  );
}

/**
 * Two states of a Post, compared: the fields that differ, then the Markdown
 * body line by line, the changed words marked inside a changed line. Sides
 * are always given oldest first. It reads the Admin's category and tag lists
 * (and, for a cover given only by its Media id, the media library), so it
 * needs the query client; the diff library comes in with this module, so
 * load it with `lazy(() => import(…))`, never statically.
 */
export function PostDiff({
  before,
  after,
  beforeName,
  afterName,
  emptyText,
  className,
}: PostDiffProps) {
  const categories = useQuery(categoryOptionsQuery);
  const tags = useQuery(tagsAdminQueryOptions());

  // Only a cover that differs is shown, so only that one needs an address.
  const coverChanged = before.coverMediaId !== after.coverMediaId;
  const missingCovers = coverChanged
    ? [before, after].flatMap((side) =>
        side.coverMediaId !== null && !side.coverUrl ? [side.coverMediaId] : [],
      )
    : [];
  const covers = useCoverUrls(missingCovers);

  const rows = useMemo(
    () => diffMarkdown(before.markdown, after.markdown),
    [before.markdown, after.markdown],
  );

  const ready =
    categories.data !== undefined &&
    tags.data !== undefined &&
    (missingCovers.length === 0 || !covers.isPending);
  const changes = useMemo(() => {
    if (!categories.data || !tags.data) return [];
    const withUrl = (side: PostDiffSide): PostDiffSide => ({
      ...side,
      coverUrl:
        side.coverUrl ??
        (side.coverMediaId === null
          ? null
          : (covers.data?.[side.coverMediaId] ?? null)),
    });
    return fieldChanges(withUrl(before), withUrl(after), {
      categories: categories.data,
      tags: tags.data,
    });
  }, [before, after, categories.data, tags.data, covers.data]);

  if (!ready) {
    return (
      <div className={cn("post-diff", className)}>
        <p className="post-diff-status" role="status">
          <Spinner size={16} />
          {m.editor_diff_loading()}
        </p>
      </div>
    );
  }

  const bodyChanged = hasBodyChange(rows);
  if (changes.length === 0 && !bodyChanged) {
    return (
      <div className={cn("post-diff", className)}>
        <EmptyState icon={GitCompareArrows} title={emptyText} />
      </div>
    );
  }

  return (
    <div className={cn("post-diff", className)}>
      <ul className="post-diff-legend" aria-label={m.editor_diff_legend_label()}>
        <li data-kind="removed">
          <span className="post-diff-swatch" aria-hidden="true" />
          {m.editor_diff_legend_removed({ side: beforeName })}
        </li>
        <li data-kind="added">
          <span className="post-diff-swatch" aria-hidden="true" />
          {m.editor_diff_legend_added({ side: afterName })}
        </li>
      </ul>
      {changes.length > 0 ? <FieldChanges changes={changes} /> : null}
      {bodyChanged ? (
        <BodyDiff rows={rows} />
      ) : (
        <p className="post-diff-muted post-diff-note">
          {m.editor_diff_body_unchanged()}
        </p>
      )}
    </div>
  );
}
