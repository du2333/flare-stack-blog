import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/** The placeholder block; clicking it opens the image picker below it. */
export function ImagePlaceholderView({
  editor,
  getPos,
  selected,
}: NodeViewProps) {
  const className = cn(
    "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-(--fuwari-input-border) bg-(--fuwari-btn-regular-bg) px-4 py-10 text-sm fuwari-text-50",
    selected && "border-(--fuwari-primary) text-(--fuwari-fg)",
  );
  const content = (
    <>
      <ImagePlus size={18} />
      <span>{m.editor_image_placeholder()}</span>
    </>
  );

  return (
    <NodeViewWrapper
      className="image-placeholder not-prose my-8"
      data-type="image-placeholder"
    >
      {editor.isEditable ? (
        <button
          type="button"
          contentEditable={false}
          onClick={() => {
            const pos = getPos();
            if (typeof pos === "number") editor.commands.openImagePicker(pos);
          }}
          className={cn(
            className,
            "transition-colors hover:border-(--fuwari-primary) hover:text-(--fuwari-fg)",
          )}
        >
          {content}
        </button>
      ) : (
        <div className={className}>{content}</div>
      )}
    </NodeViewWrapper>
  );
}
