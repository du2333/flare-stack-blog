import { Fragment } from "react";
import { splitCommentLine } from "@/features/comments/comment-body";

export function CommentBody({
  content,
  className,
  linkClassName = "underline underline-offset-2 break-all",
}: {
  content: string | null | undefined;
  className?: string;
  linkClassName?: string;
}) {
  if (!content) return null;

  return (
    <div className={className}>
      {content.split("\n").map((line, index) => (
        <Fragment key={index}>
          {index > 0 ? <br /> : null}
          {splitCommentLine(line).map((part, partIndex) =>
            part.type === "link" ? (
              <a
                key={partIndex}
                href={part.value}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClassName}
              >
                {part.value}
              </a>
            ) : (
              <Fragment key={partIndex}>{part.value}</Fragment>
            ),
          )}
        </Fragment>
      ))}
    </div>
  );
}
