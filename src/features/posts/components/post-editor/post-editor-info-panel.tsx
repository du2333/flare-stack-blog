import { X } from "lucide-react";
import { useId, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { SectionHeading } from "@/components/ui/page-heading";
import { Sheet } from "@/components/ui/sheet";
import { m } from "@/paraglide/messages";

// A non-modal inspector: media pickers and select menus may portal outside it.
// From 1024px it is docked beside the document, which moves over for it;
// below that it covers the document (see post-editor.css).
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
      initialFocus={() => closeRef.current}
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
