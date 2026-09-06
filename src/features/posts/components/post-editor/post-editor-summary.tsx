import { useQuery } from "@tanstack/react-query";
import { BookOpen, Image, Pencil, Tag } from "lucide-react";
import { categoriesAdminQueryOptions } from "@/features/categories/queries";
import { tagsAdminQueryOptions } from "@/features/tags/queries";
import { m } from "@/paraglide/messages";

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
  const { data: categories } = useQuery(categoriesAdminQueryOptions());
  const { data: tags } = useQuery(tagsAdminQueryOptions());
  const category = categories?.items.find((item) => item.id === categoryId);
  const tagNames =
    tags?.filter((tag) => tagIds.includes(tag.id)).map((tag) => tag.name) ?? [];
  const content = (
    <>
      <span>
        <BookOpen size={15} />
        {category?.name ?? m.editor_meta_uncategorized()}
      </span>
      <span className="post-editor-summary-tags">
        <Tag size={15} />
        {tagNames.join(" / ") || m.editor_meta_tags_empty()}
      </span>
      <span>
        <Image size={15} />
        {hasCover ? m.editor_meta_cover() : m.editor_meta_cover_empty()}
      </span>
      {onOpenInfo && <Pencil size={14} />}
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
