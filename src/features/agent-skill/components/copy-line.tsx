import { CopyButton } from "@/components/ui/copy-button";

/**
 * A line of text that is meant to be copied, with its copy button. A
 * `command` is typed into a terminal and looks like one; `say` is something
 * to tell an agent, in the page's own type.
 */
export function CopyLine({
  text,
  copyLabel,
  copiedLabel,
  kind = "say",
}: {
  text: string;
  copyLabel: string;
  copiedLabel: string;
  kind?: "command" | "say";
}) {
  return (
    <div className="agent-skill-copyline" data-kind={kind}>
      <code>{text}</code>
      <CopyButton text={text} label={copyLabel} copiedLabel={copiedLabel} />
    </div>
  );
}
