import { useQuery } from "@tanstack/react-query";
import { Folder, ImagePlus, Settings2 } from "lucide-react";
import { categoryOptionsQuery } from "@/features/categories/queries";
import { tagsAdminQueryOptions } from "@/features/tags/queries";
import { m } from "@/paraglide/messages";

/** The Tags a document names under its title; the rest are counted. */
const TAGS_SHOWN = 4;

/**
 * What the Post is filed under, under its title: the Category, the Tags, and
 * a way to add a cover while it has none. In the editor the row opens the
 * Post's information.
 */
export function PostEditorSummary({
  categoryId,
  tagIds,
  hasCover,
  onOpenInfo,
}: {
  categoryId: number | null;
  tagIds: number[];
  hasCover: boolean;
  onOpenInfo?: () => void;
}) {
  const { data: categories } = useQuery(categoryOptionsQuery);
  const { data: tags } = useQuery(tagsAdminQueryOptions());
  const category = categories?.find((item) => item.id === categoryId);
  const tagNames =
    tags?.filter((tag) => tagIds.includes(tag.id)).map((tag) => tag.name) ?? [];
  const shown = tagNames.slice(0, TAGS_SHOWN);
  const content = (
    <>
      <span className="post-editor-chip" data-empty={category ? undefined : ""}>
        <Folder size={13} />
        {category?.name ?? m.editor_meta_uncategorized()}
      </span>
      {shown.length > 0 ? (
        shown.map((name) => (
          <span key={name} className="post-editor-chip">
            #{name}
          </span>
        ))
      ) : (
        <span className="post-editor-chip" data-empty="">
          {m.editor_meta_tags_empty()}
        </span>
      )}
      {tagNames.length > shown.length ? (
        <span className="post-editor-chip">
          +{tagNames.length - shown.length}
        </span>
      ) : null}
      {onOpenInfo && !hasCover ? (
        <span className="post-editor-chip" data-empty="">
          <ImagePlus size={13} />
          {m.editor_cover_add()}
        </span>
      ) : null}
      {onOpenInfo ? (
        <Settings2 size={14} className="post-editor-summary-edit" />
      ) : null}
    </>
  );
  return onOpenInfo ? (
    <button
      type="button"
      className="post-editor-summary"
      onClick={onOpenInfo}
      aria-label={m.editor_info_title()}
    >
      {content}
    </button>
  ) : (
    <div className="post-editor-summary">{content}</div>
  );
}
