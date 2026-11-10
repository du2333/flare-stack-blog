import { X } from "lucide-react";
import { useId, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { SectionHeading } from "@/components/ui/page-heading";
import { Sheet } from "@/components/ui/sheet";
import { m } from "@/paraglide/messages";

// A non-modal inspector: media pickers and select menus may portal outside it.
// Below lg its heading and footer are hidden: the Admin top bar carries the
// title and the Done button (see post-editor.css).
export function PostEditorInfoPanel({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      modal={false}
      backdrop
      backdropClassName="post-editor-info-backdrop"
      as="aside"
      initialFocus={() => {
        const close = closeRef.current;
        // Below lg the top bar closes the panel, so the panel itself takes focus.
        return close && close.getClientRects().length > 0
          ? close
          : (close?.closest<HTMLElement>(".post-editor-info-panel") ?? null);
      }}
      className="post-editor-info-panel"
      aria-labelledby={titleId}
    >
      <SectionHeading
        className="post-editor-panel-heading"
        size="sm"
        title={m.editor_info_title()}
        titleProps={{ id: titleId }}
        actions={
          <IconButton
            ref={closeRef}
            size="md"
            onClick={onClose}
            label={m.common_close()}
          >
            <X size={18} />
          </IconButton>
        }
      />
      {children}
      <footer className="post-editor-info-footer">
        <Button onClick={onClose}>{m.editor_info_done()}</Button>
      </footer>
    </Sheet>
  );
}
