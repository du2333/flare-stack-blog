import { Loader2, Send } from "lucide-react";
import { type ReactNode, useState } from "react";
import { m } from "@/paraglide/messages";

interface CommentEditorProps {
  onSubmit: (content: string) => Promise<void>;
  isSubmitting?: boolean;
  autoFocus?: boolean;
  onCancel?: () => void;
  submitLabel?: string;
  challenge?: ReactNode;
}

export const FuwariCommentEditor = ({
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
    <div className="relative rounded-(--fuwari-radius-large) border border-(--fuwari-input-border) bg-transparent transition-all duration-300 focus-within:bg-(--fuwari-primary)/5 focus-within:border-(--fuwari-primary)/50 focus-within:shadow-sm">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        autoFocus={autoFocus}
        placeholder={m.comments_editor_placeholder()}
        rows={3}
        className="min-h-20 w-full bg-transparent px-4 py-3 text-sm focus:outline-none fuwari-text-75 resize-y"
      />
      <div className="flex flex-col gap-2 px-4 pb-3 pt-2 border-t border-black/5 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between">
        {challenge ? <div className="min-w-0">{challenge}</div> : <div />}
        <div className="flex items-center gap-3 self-end">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="fuwari-text-50 text-sm hover:fuwari-text-75 transition-colors"
            >
              {m.comments_editor_cancel()}
            </button>
          )}
          <button
            type="button"
            disabled={isEmpty || isSubmitting}
            onClick={handleSubmit}
            className="fuwari-btn-primary h-8 px-4 text-sm rounded-lg gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>{actualSubmitLabel}</span>
            {isSubmitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
