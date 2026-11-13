import type { ComponentType } from "react";
import type { ThemeId } from "../theme-ids";
import type { Theme } from "../themes";
import { ClassicThumbnail } from "./classic-thumbnail";
import { ImmersiveThumbnail } from "./immersive-thumbnail";
import { NamecardThumbnail } from "./namecard-thumbnail";
import { SidebarThumbnail } from "./sidebar-thumbnail";

/**
 * The built-in Themes' thumbnails. Only the Admin's Theme picker draws them,
 * so they are kept out of the registry (`themes.ts`), which every public page
 * loads.
 */
const BUILT_IN_THUMBNAILS = {
  classic: ClassicThumbnail,
  namecard: NamecardThumbnail,
  immersive: ImmersiveThumbnail,
  sidebar: SidebarThumbnail,
} satisfies Record<ThemeId, ComponentType>;

/**
 * The schematic the picker draws for a Theme: a built-in Theme's own, else
 * the one the Theme brings (`Theme.thumbnail`), else none.
 */
export function themeThumbnail(
  theme: Pick<Theme, "id" | "thumbnail">,
): ComponentType | undefined {
  return (
    (BUILT_IN_THUMBNAILS as Partial<Record<string, ComponentType>>)[theme.id] ??
    theme.thumbnail
  );
}
