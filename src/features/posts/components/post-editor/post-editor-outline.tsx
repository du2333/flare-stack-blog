import type { Editor as TiptapEditor } from "@tiptap/react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";
import { outlineOf, textStats } from "./post-editor-stats";

/** A heading counts as reached once it is this close to the top of the page. */
const REACHED_OFFSET = 140;

function headingElement(editor: TiptapEditor, pos: number) {
  const node = editor.view.nodeDOM(pos);
  return node instanceof HTMLElement ? node : null;
}

/**
 * The document's headings beside the page, on screens with room for them:
 * the one being read is marked, and a click scrolls to a heading.
 */
export function PostEditorOutline({
  editor,
  epoch,
  scrollContainerId,
}: {
  editor: TiptapEditor | null;
  /** Changes with every edit. */
  epoch: number;
  scrollContainerId: string;
}) {
  const settled = useDeferredValue(epoch);
  const items = useMemo(
    () => (editor && !editor.isDestroyed ? outlineOf(editor.state.doc) : []),
    // `settled` stands for the document's content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, settled],
  );
  const [active, setActive] = useState(0);

  useEffect(() => {
    const scroller = document.getElementById(scrollContainerId);
    if (!editor || !scroller || items.length === 0) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      if (editor.isDestroyed) return;
      const top = scroller.getBoundingClientRect().top + REACHED_OFFSET;
      let reached = 0;
      items.forEach((item, index) => {
        const element = headingElement(editor, item.pos);
        if (element && element.getBoundingClientRect().top <= top)
          reached = index;
      });
      setActive(reached);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [editor, items, scrollContainerId]);

  if (!editor || items.length < 2) return null;
  const top = Math.min(...items.map((item) => item.level));

  return (
    <nav className="post-editor-outline" aria-label={m.editor_outline_title()}>
      <p>{m.editor_outline_title()}</p>
      <ol>
        {items.map((item, index) => (
          <li key={`${item.pos}:${item.text}`}>
            <Button
              variant="plain"
              size="sm"
              className="post-editor-outline-item"
              data-depth={Math.min(item.level - top, 2)}
              aria-current={index === active ? "location" : undefined}
              onClick={() =>
                headingElement(editor, item.pos)?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
            >
              <span>{item.text}</span>
            </Button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** How long the document is and how long it takes to read. */
export function PostEditorStats({
  editor,
  epoch,
}: {
  editor: TiptapEditor | null;
  epoch: number;
}) {
  const settled = useDeferredValue(epoch);
  const stats = useMemo(
    () =>
      editor && !editor.isDestroyed
        ? textStats(editor.state.doc.textContent)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, settled],
  );
  if (!stats || stats.count === 0) return null;
  return (
    <p className="post-editor-stats">
      <span>
        {m.editor_stats_count({ count: stats.count.toLocaleString() })}
      </span>
      <i aria-hidden="true" />
      <span>{m.editor_stats_reading({ minutes: stats.minutes })}</span>
    </p>
  );
}
