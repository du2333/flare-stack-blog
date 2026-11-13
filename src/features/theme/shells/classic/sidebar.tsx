import type { SidebarCard } from "@/features/theme/theme-shell";
import { cn } from "@/lib/utils";

/** Index cards stagger in after the rest, 50ms apart. */
const CARD_DELAY_MS = { identity: 100, feed: 125, index: 150 } as const;
const INDEX_STEP_MS = 50;

/** The cards in the given order; index cards stay in view together below the rest. */
export function Sidebar({
  className,
  cards,
}: {
  className?: string;
  cards: Array<SidebarCard>;
}) {
  const leading = cards.filter((card) => card.kind !== "index");
  const index = cards.filter((card) => card.kind === "index");
  return (
    <aside
      className={cn("flex flex-col gap-4", className)}
      data-shell-region="sidebar"
    >
      {leading.map((card) => (
        <div
          key={card.id}
          className="fuwari-onload-animation"
          style={{ animationDelay: `${CARD_DELAY_MS[card.kind]}ms` }}
        >
          {card.content}
        </div>
      ))}
      {index.length > 0 ? (
        <div className="sticky top-4 flex flex-col gap-4">
          {index.map((card, position) => (
            <div
              key={card.id}
              className="fuwari-onload-animation"
              style={{
                animationDelay: `${CARD_DELAY_MS.index + position * INDEX_STEP_MS}ms`,
              }}
            >
              {card.content}
            </div>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
