import { Ellipsis } from "lucide-react";
import type { ReactNode } from "react";
import { useThemeRecipe } from "@/features/theme/components/theme-recipe";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export function ExpandableSidebarCard({
  title,
  collapsed,
  onExpand,
  contentClassName,
  children,
}: {
  title: string;
  collapsed: boolean;
  onExpand: () => void;
  contentClassName?: string;
  children: ReactNode;
}) {
  const { headingAccent } = useThemeRecipe();
  return (
    <div className="fuwari-card-base fuwari-card-widget pb-4">
      <div className="fuwari-widget-title font-bold relative ml-6 mt-4 mb-2">
        {headingAccent === "on" ? (
          <span
            className="absolute -left-4 top-[5.5px] w-1 h-4 rounded-md"
            style={{ backgroundColor: "var(--theme-accent)" }}
          />
        ) : null}
        {title}
      </div>
      <div
        className={cn("px-4", contentClassName, "overflow-hidden")}
        style={collapsed ? { height: "7.5rem" } : undefined}
      >
        {children}
      </div>
      {collapsed && (
        <div className="px-4 -mb-2">
          <button
            type="button"
            onClick={onExpand}
            className="rounded-lg w-full h-9 flex items-center justify-center text-black/75 hover:text-(--theme-accent) dark:text-white/75 dark:hover:text-(--theme-accent) hover:bg-(--fuwari-btn-plain-bg-hover) active:bg-(--fuwari-btn-plain-bg-active) transition"
          >
            <span className="text-(--theme-widget-more-color,var(--theme-accent)) flex items-center justify-center gap-2 -translate-x-2">
              <Ellipsis size={28} />
              {m.widget_more()}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
