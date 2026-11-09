import type { Editor } from "@tiptap/react";
import { useRef, useState } from "react";
import { ImageSourcePicker } from "@/features/media/components/media-library/components";
import type { ImageSourceTab } from "@/features/media/components/media-library/components/image-source-picker";
import { useMediaPicker } from "@/features/media/components/media-library/hooks";
import type { MediaAsset } from "@/features/media/components/media-library/types";
import { useImagePicker } from "@/features/posts/editor/extensions/image-placeholder";
import { m } from "@/paraglide/messages";
import { EditorPopover } from "./editor-popover";

/**
 * The image picker below an image placeholder: upload a file, import an
 * image URL into the media library, or pick from the library. Picking puts
 * the image in the placeholder's place; Escape or a click elsewhere keeps the
 * placeholder.
 */
export function ImagePickerPopover({ editor }: { editor: Editor | null }) {
  const target = useImagePicker(editor);
  const open = target !== null;
  const [tab, setTab] = useState<ImageSourceTab>("upload");
  const tabsRef = useRef<HTMLDivElement>(null);
  const library = useMediaPicker(open);

  const fill = (asset: MediaAsset) => {
    editor
      ?.chain()
      .fillImagePlaceholder({
        src: asset.url,
        width: asset.width || undefined,
        height: asset.height || undefined,
      })
      .focus()
      .run();
  };

  return (
    <EditorPopover
      editor={editor}
      open={open}
      anchor={target}
      onClose={() => editor?.commands.closeImagePicker()}
      initialFocus={() =>
        tabsRef.current?.querySelector<HTMLElement>('[aria-selected="true"]') ??
        null
      }
      role="dialog"
      aria-label={m.editor_image_picker_title()}
      className="flex w-96 max-w-[calc(100vw-1rem)] flex-col gap-2 p-2"
    >
      <ImageSourcePicker
        tabsRef={tabsRef}
        tab={tab}
        onTabChange={setTab}
        library={library}
        onFiles={([file]) => editor?.commands.uploadImageToPlaceholder(file)}
        onSelect={fill}
      />
    </EditorPopover>
  );
}
