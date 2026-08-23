import { Loader2, Send } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

interface CommentEditorProps {
  onSubmit: (content: string) => Promise<void>;
  isSubmitting?: boolean;
  autoFocus?: boolean;
  onCancel?: () => void;
  submitLabel?: string;
  challenge?: ReactNode;
}

export const CommentEditor = ({
  onSubmit,
  isSubmitting,
  autoFocus,
  onCancel,
  submitLabel,
  challenge,
}: CommentEditorProps) => {
  const actualSubmitLabel = submitLabel || m.comments_editor_submit();
  const [value, setValue] = useState("");
  const isEmpty = value.trim() === "";

  const handleSubmit = async () => {
    if (isEmpty || isSubmitting) return;
    try {
      await onSubmit(value.trim());
      setValue("");
    } catch {
      // Error handled by parent hook
    }
  };

  return (
    <div className="relative group/editor border border-border/10 rounded-sm bg-muted/5 transition-colors duration-300 hover:border-border/30 focus-within:border-border/50 focus-within:bg-background">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        autoFocus={autoFocus}
        placeholder={m.comments_editor_placeholder()}
        rows={3}
        className="min-h-20 w-full bg-transparent px-4 py-3 text-sm focus:outline-none placeholder:text-muted-foreground/30 resize-y"
      />
      <div className="flex flex-col gap-2 px-4 pb-2 pt-2 border-t border-border/10 sm:flex-row sm:items-center sm:justify-between">
        {challenge ? <div className="min-w-0">{challenge}</div> : <div />}
        <div className="flex items-center gap-4 self-end">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-[10px] uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              {m.comments_editor_cancel()}
            </button>
          )}
          <Button
            size="sm"
            disabled={isEmpty || isSubmitting}
            onClick={handleSubmit}
            variant="ghost"
            className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest hover:bg-transparent hover:text-foreground p-0 flex items-center gap-2 group/btn"
          >
            <span>{actualSubmitLabel}</span>
            {isSubmitting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Send
                size={12}
                className="group-hover/btn:translate-x-0.5 transition-transform"
              />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
