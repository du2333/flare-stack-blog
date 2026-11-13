import { splitQuotedTerms } from "@/lib/quoted-terms";

/** Prose that keeps each short quoted term, such as 「删除」, on one line. */
export function QuotedText({ children }: { children: string }) {
  return splitQuotedTerms(children).map((part, index) =>
    part.keep ? (
      <span key={index} className="whitespace-nowrap">
        {part.text}
      </span>
    ) : (
      part.text
    ),
  );
}
