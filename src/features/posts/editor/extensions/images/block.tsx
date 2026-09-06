import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { parseImageSize } from "@/features/posts/utils/normalize-content";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export function ImageBlock({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) {
  const src = node.attrs.src;
  const isUploading = Boolean(node.attrs.uploadId || src?.startsWith("blob:"));
  const width = parseImageSize(node.attrs.width);
  const height = parseImageSize(node.attrs.height);
  const isPortrait = !!(width && height && height > width);

  const aspectRatio = useMemo(() => {
    if (isPortrait || !width || !height) return "auto";
    return `${width} / ${height}`;
  }, [height, isPortrait, width]);

  return (
    <NodeViewWrapper className="image-node-view not-prose relative my-8 outline-none [&.ProseMirror-selectednode]:outline-none [&.ProseMirror-selectednode]:ring-0">
      <div
        className={cn(
          "relative overflow-hidden rounded-xl",
          selected && "ring-2 ring-(--fuwari-primary)",
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden bg-(--fuwari-btn-regular-bg)",
            isPortrait
              ? "flex max-h-[70vh] items-center justify-center"
              : "max-h-[80vh]",
          )}
          style={{ aspectRatio }}
        >
          <img
            src={src}
            alt={node.attrs.alt}
            className={cn(
              "mx-auto transition-opacity duration-300",
              isPortrait
                ? "mx-auto block h-auto w-auto max-h-[70vh] max-w-full"
                : "mx-auto h-auto max-h-[80vh] w-full object-contain",
              isUploading ? "opacity-50" : "opacity-100",
            )}
          />

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 rounded-xl bg-(--fuwari-card-bg) px-3 py-2 text-sm fuwari-text-50 shadow-md">
                <Loader2 className="animate-spin" size={14} />
                <span>{m.media_upload_status_uploading()}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <input
        type="text"
        value={node.attrs.alt || ""}
        onChange={(e) => updateAttributes({ alt: e.target.value })}
        placeholder={isUploading ? "..." : m.editor_image_caption_placeholder()}
        disabled={isUploading}
        className="mt-4 w-full bg-transparent text-center text-sm font-medium fuwari-text-50 outline-none placeholder:fuwari-text-30 disabled:opacity-50"
      />
    </NodeViewWrapper>
  );
}
