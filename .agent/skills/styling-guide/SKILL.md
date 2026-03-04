---
name: styling-guide
description: Official styling and design guidelines for the Flare Stack Blog.
---

# Design & Styling Guidelines

## 1. CSS Architecture

### Layered Styling

The project uses a three-layer styling architecture. Each layer has clear responsibilities:

| Layer | Location | Scope |
| :--- | :--- | :--- |
| **Global** | `src/styles.css` | TailwindCSS 4 entry, dark/light mode variants, base element resets. Shared by ALL themes. **Do not modify for theme-specific changes.** |
| **Shared** | `src/styles/` | Shared styles for non-themed areas (e.g. `admin.css` for admin panel). |
| **Theme** | `themes/<name>/styles/` | Theme-private styles: colors, fonts, typography, component styles. Imported via `index.ts`. Only loaded when the theme is active. |

### Base Element Styling

Global styles apply `@apply` defaults for `h1`-`h6`, `p`, `ul`/`ol` targeting Markdown content rendering. When building **UI components** (navbars, sidebars, admin panels), explicitly **reset** these styles:

```css
/* UI components must reset markdown defaults */
.nav-list { @apply list-none m-0 p-0; }
```

## 2. Typography System (Admin & Shared)

The admin panel and shared components use a curated font stack:

| Role | Font Family | Usage |
| :--- | :--- | :--- |
| **Headings** | `Noto Serif SC Variable` | Primary structural elements |
| **Body** | `Noto Sans SC Variable` | Long-form reading and general UI |
| **Data / Meta** | `JetBrains Mono Variable` | Timestamps, IDs, Tags, Stats |

> **Note**: Themes may define their own typography in `themes/<name>/styles/`. The above applies to shared/admin areas.

## 3. Dark Mode

Use Tailwind's `dark:` variant. The project supports `light` and `dark` modes via a class-based toggle. Theme-specific color tokens should be defined as CSS custom properties in the theme's stylesheet.

## 4. General Patterns

- **Buttons**: Prefer text-based buttons or icon-only actions. Avoid heavy backgrounds.
- **Navigation**: Keep it subtle. Sticky elements should not obstruct content.
- **Layout**:
    - **Mobile First**: Always ensure horizontal lists (like Tags) wrap.
    - **Spacing**: Err on the side of too much whitespace rather than too little.
- **Interaction**: Hover effects should be subtle changes in opacity or color, avoiding layout shifts.
- **Styling Library**: Use `class-variance-authority` (`cva`) for component variants, `clsx` + `tailwind-merge` for conditional class merging.
