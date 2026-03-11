import type { JSONContent } from "@tiptap/react";
import clsx from "clsx";
import { m } from "@/paraglide/messages";
import { CommentEditor } from "./comment-editor";

interface CommentReplyFormProps {
  parentUserName: string;
  onSubmit: (content: JSONContent) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
  className?: string;
}

export const CommentReplyForm = ({
  parentUserName,
  onSubmit,
  isSubmitting,
  onCancel,
  className,
}: CommentReplyFormProps) => {
  return (
    <div
      className={clsx(
        "mt-4 animate-in fade-in slide-in-from-top-2 duration-300",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          {m.comments_item_reply()}
        </span>
        <span className="text-xs font-medium text-primary">
          @{parentUserName}
        </span>
      </div>
      <CommentEditor
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        autoFocus
        onCancel={onCancel}
        submitLabel={m.comments_editor_submit_reply()}
      />
    </div>
  );
};
