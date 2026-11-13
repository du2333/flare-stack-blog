import { useLocation } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import type { NavGroupOption } from "@/components/layout/layout-props";
import { isNavOptionCurrent } from "@/components/layout/nav-options";
import { PublicNavLink } from "@/components/layout/public-nav-link";
import { Menu, MenuLinkItem } from "@/components/ui/menu";
import { cn } from "@/lib/utils";

/**
 * A group of the navigation in a bar: a trigger with the group's name, and a
 * menu of its links below it on the shared float surface (`.fuwari-float`).
 * The group leads nowhere itself. A click opens and closes the menu, a mouse
 * resting on the trigger opens it and leaving closes it shortly after; Enter
 * or Space opens it on the current link or the first, the arrows move between
 * the links, and Escape closes it back onto the trigger. The trigger is marked
 * current (`activeClassName`, `data-current`) while one of the links is the
 * page, and so is that link in the menu.
 *
 * `className` is the shell's for its navigation entries; the trigger is a
 * `button`, and its chevron turns while the menu is open.
 */
export function NavGroupMenu({
  group,
  className,
  activeClassName,
}: {
  group: NavGroupOption;
  className?: string;
  activeClassName?: string;
}) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const current = isNavOptionCurrent(group, pathname);
  return (
    <Menu
      label={group.label}
      placement="bottom-start"
      openOnHover
      triggerClassName={cn(
        "group/nav-group",
        className,
        current && activeClassName,
      )}
      triggerData={{ "data-current": current ? "true" : undefined }}
      trigger={
        <>
          <span className="truncate">{group.label}</span>
          <ChevronDown
            size={14}
            strokeWidth={2}
            aria-hidden="true"
            className="ml-1 shrink-0 opacity-70 transition-transform duration-200 group-aria-expanded/nav-group:rotate-180 motion-reduce:transition-none"
          />
        </>
      }
    >
      {group.children.map((child) => (
        <MenuLinkItem
          key={child.id}
          current={isNavOptionCurrent(child, pathname)}
          render={(props) => <PublicNavLink option={child} {...props} />}
        />
      ))}
    </Menu>
  );
}
