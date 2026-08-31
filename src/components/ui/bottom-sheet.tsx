import { ClientOnly } from "@tanstack/react-router";
import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const DISMISS_PX = 96;

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  preventClose = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  preventClose?: boolean;
}) {
  return (
    <ClientOnly>
      <BottomSheetInternal
        open={open}
        onClose={onClose}
        title={title}
        preventClose={preventClose}
      >
        {children}
      </BottomSheetInternal>
    </ClientOnly>
  );
}

function BottomSheetInternal({
  open,
  onClose,
  title,
  children,
  preventClose,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  preventClose: boolean;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const dragY = useRef(0);
  const dragging = useRef(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open || preventClose) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, preventClose, onClose]);

  const resetDrag = () => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.style.transform = "";
    sheet.style.transition = "";
    dragY.current = 0;
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (preventClose) return;
    dragging.current = true;
    startY.current = event.clientY;
    dragY.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
    const sheet = sheetRef.current;
    if (sheet) sheet.style.transition = "none";
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !sheetRef.current) return;
    const dy = Math.max(0, event.clientY - startY.current);
    dragY.current = dy;
    sheetRef.current.style.transform = `translateY(${dy}px)`;
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragY.current > DISMISS_PX) {
      resetDrag();
      onClose();
      return;
    }
    resetDrag();
  };

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-100 lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={preventClose ? undefined : onClose}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
        className={cn(
          "absolute inset-x-3 bottom-3 flex max-h-[min(88dvh,40rem)] flex-col overflow-hidden rounded-[1.25rem] bg-(--fuwari-card-bg) shadow-lg transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-[calc(100%+0.75rem)]",
        )}
      >
        <div
          className="flex shrink-0 touch-none flex-col items-center pt-2 pb-1"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="h-1 w-10 rounded-full bg-(--fuwari-fg-30)" />
          <h2
            id="bottom-sheet-title"
            className="mt-3 w-full px-5 text-lg font-medium fuwari-text-90"
          >
            {title}
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
