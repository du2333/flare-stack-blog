import type { ReactNodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { ExternalLink, Video } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  DirectVideoPoster,
  directVideoHost,
  VideoPoster,
  videoProviderName,
} from "@/features/posts/components/content/video-embed";
import {
  directVideoOf,
  videoMetaOf,
  videoPageUrl,
  videoSourceOf,
} from "@/features/posts/utils/video-source";
import { useDismissOnOutside } from "@/hooks/use-dismiss-on-outside";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getDirectVideoResolver, useVideoEditor } from "./state";
import { VideoEditorPanel } from "./video-editor-panel";

/**
 * A video block in the editor: the poster readers see before playing, not
 * the player, so the block selects and moves like any other. An empty block
 * asks for a link. Clicking it in an editable editor opens the link input in
 * its place.
 */
export function VideoView({
  editor,
  node,
  getPos,
  selected,
}: ReactNodeViewProps) {
  const source = videoSourceOf(node.attrs);
  const direct = source ? null : directVideoOf(node.attrs);
  const open = useVideoEditor(editor);
  const editing = open !== null && open.pos === getPos();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);
  useDismissOnOutside(
    wrapperRef,
    () => editor.commands.closeVideoEditor(),
    editing,
  );

  const openEditor = () => {
    const pos = getPos();
    if (typeof pos === "number") editor.commands.openVideoEditor(pos);
  };

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      data-type="video"
      className="not-prose my-6 outline-none [&.ProseMirror-selectednode]:outline-none [&.ProseMirror-selectednode]:ring-0"
    >
      {editing && open ? (
        <div
          role="group"
          aria-label={
            open.inserted ? m.editor_video_insert() : m.editor_video_edit()
          }
          className="rounded-xl p-3 ring-1 ring-(--fuwari-input-border)"
        >
          <VideoEditorPanel
            link={
              source
                ? videoPageUrl(source)
                : direct
                  ? (direct.pageUrl ?? direct.src)
                  : ""
            }
            direct={direct}
            inserted={open.inserted}
            resolveDirectVideo={getDirectVideoResolver(editor)}
            inputRef={inputRef}
            onApply={(next) => editor.commands.applyVideo(next)}
            onApplyDirect={(next) => editor.commands.applyDirectVideo(next)}
            onCancel={() => {
              editor.commands.closeVideoEditor();
              editor.commands.focus();
            }}
          />
        </div>
      ) : source ? (
        <div>
          <div
            onClick={openEditor}
            className={cn(
              "group rounded-xl",
              editor.isEditable && "cursor-pointer",
              selected &&
                "ring-2 ring-(--fuwari-primary) ring-offset-2 ring-offset-(--fuwari-card-bg)",
            )}
          >
            <VideoPoster source={source} meta={videoMetaOf(node.attrs)} />
          </div>
          <div className="mt-2 flex items-center justify-center gap-3 text-xs fuwari-text-50">
            <span>
              {videoProviderName(source.provider)} · {source.videoId}
              {source.page ? ` · P${source.page}` : null}
            </span>
            <a
              href={videoPageUrl(source)}
              target="_blank"
              rel="noopener noreferrer"
              className="no-styling inline-flex items-center gap-1 hover:text-(--fuwari-primary)"
            >
              {m.editor_video_open()}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      ) : direct ? (
        <div>
          <div
            onClick={openEditor}
            className={cn(
              "group rounded-xl",
              editor.isEditable && "cursor-pointer",
              selected &&
                "ring-2 ring-(--fuwari-primary) ring-offset-2 ring-offset-(--fuwari-card-bg)",
            )}
          >
            <DirectVideoPoster video={direct} />
          </div>
          <div className="mt-2 flex items-center justify-center gap-3 text-xs fuwari-text-50">
            <span>
              {m.editor_video_direct_info({ host: directVideoHost(direct) })}
            </span>
            <a
              href={direct.pageUrl ?? direct.src}
              target="_blank"
              rel="noopener noreferrer"
              className="no-styling inline-flex items-center gap-1 hover:text-(--fuwari-primary)"
            >
              {m.editor_video_open()}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openEditor}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-(--fuwari-input-border) bg-(--fuwari-btn-regular-bg) px-4 py-10 text-sm fuwari-text-50",
            selected && "border-(--fuwari-primary)",
          )}
        >
          <Video className="h-5 w-5" />
          <span>{m.editor_video_placeholder()}</span>
        </button>
      )}
    </NodeViewWrapper>
  );
}
