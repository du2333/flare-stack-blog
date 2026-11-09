import { publicLinkAttributes } from "@/features/posts/utils/public-link";
import { splitMomentText } from "@/features/moments/utils/moment-text";
import { cn } from "@/lib/utils";

/**
 * A Moment's text: line breaks kept, each web address a link that opens as a
 * post's body links do.
 */
export function MomentText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <p className={cn("whitespace-pre-wrap wrap-break-word", className)}>
      {splitMomentText(text).map((part, index) =>
        part.type === "link" ? (
          <a
            key={index}
            {...publicLinkAttributes({ href: part.value })}
            className="break-all text-(--fuwari-primary) underline decoration-dashed underline-offset-4 hover:decoration-solid"
          >
            {part.value}
          </a>
        ) : (
          part.value
        ),
      )}
    </p>
  );
}
