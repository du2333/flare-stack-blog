import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { QuotedText } from "@/components/ui/quoted-text";
import { m } from "@/paraglide/messages";
import "./theme-preview-bar.css";

/**
 * Says that the page shows a Theme the Admin has not saved. It floats over
 * the bottom of the window, outside the shell, so every Theme shows it the
 * same way and its first screen keeps its own layout.
 */
export function ThemePreviewBar({
  themeName,
  onExit,
}: {
  themeName: string;
  onExit: () => void;
}) {
  return (
    <aside
      className="theme-preview-bar"
      aria-label={m.theme_preview_bar_label()}
    >
      <Callout
        icon={Eye}
        action={
          <Button variant="primary" size="sm" onClick={onExit}>
            {m.theme_preview_exit()}
          </Button>
        }
      >
        <QuotedText>{m.theme_preview_bar({ name: themeName })}</QuotedText>
      </Callout>
    </aside>
  );
}
