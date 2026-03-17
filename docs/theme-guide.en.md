# Theme Development Guide

This document explains how to create a custom theme for the Flare Stack Blog.

## Overview

The theme system of Flare Stack Blog is designed around the separation of **Contract** and **Implementation**:

- **Contract Layer** (`src/features/theme/contract/`): Defined by the framework, describing the Props interface for each page and layout component. Business logic, routing, and data fetching are entirely on this side, unaware of themes.
- **Implementation Layer** (`src/features/theme/themes/<your-theme>/`): Implemented by theme developers, strictly responsible for rendering UI without any knowledge of backend details.

The routing layer references the currently active theme via `import theme from "@theme"`, where `@theme` is a compile-time alias pointing to the selected theme directory during the build. The two sides use TypeScript interfaces as boundaries, so the compiler will immediately catch any missing components.

```
vite.config.ts
  THEME=my-theme  →  @theme  →  src/features/theme/themes/my-theme/index.ts
```

## Theme Contract

Contracts are defined in three files. You only need to **read** these types when developing a theme, no modification is needed.

### `contract/components.ts` — Component Manifest

The `ThemeComponents` interface lists all the components a theme must export. Your `index.ts` must satisfy this interface:

| Field                                         | Description                                                   |
| :-------------------------------------------- | :------------------------------------------------------------ |
| `PublicLayout`                                | Public layout (including Navbar / Footer)                     |
| `AuthLayout`                                  | Authentication page layout                                    |
| `UserLayout`                                  | Layout specifically for logged-in users                       |
| `HomePage` / `HomePageSkeleton`               | Home page and its loading skeleton                            |
| `PostsPage` / `PostsPageSkeleton`             | Post list page and skeleton                                   |
| `PostPage` / `PostPageSkeleton`               | Post detail page and skeleton                                 |
| `FriendLinksPage` / `FriendLinksPageSkeleton` | Friend link list page and skeleton                            |
| `SearchPage`                                  | Search page                                                   |
| `SubmitFriendLinkPage`                        | Submit friend link page                                       |
| `LoginPage`                                   | Login page                                                    |
| `RegisterPage`                                | Registration page                                             |
| `ForgotPasswordPage`                          | Forgot password page                                          |
| `ResetPasswordPage`                           | Reset password page                                           |
| `VerifyEmailPage`                             | Email verification page                                       |
| `ProfilePage`                                 | User profile page                                             |
| `config`                                      | Static theme config (data fetching params and preload config) |
| `getDocumentStyle`                            | Optional: inject theme style variables onto the document root |
| `Toaster`                                     | Toast notification component (Sonner wrapper)                 |

> **Skeletons**: Used as `pendingComponent` in TanStack Router, showing a transitional UI during page data requests. Themes can decide whether to implement it based on their interaction design language (for instance, to coordinate with certain enter animations, you might choose to just return `null` instead of rendering placeholders).

### `contract/layouts.ts` — Layout Props

```ts
interface PublicLayoutProps {
  children: React.ReactNode;
  navOptions: Array<{ label: string; to: string; id: string }>;
  user?: { name: string; image?: string | null; role?: string | null };
  isSessionLoading: boolean;
  logout: () => Promise<void>;
}

interface AuthLayoutProps {
  onBack: () => void;
  children: React.ReactNode;
}

interface UserLayoutProps {
  isAuthenticated: boolean;
  children: React.ReactNode;
}
```

### `contract/pages/` — Page Props

Each page corresponds to an independent file, for example:

```ts
// contract/pages/home.ts
interface HomePageProps {
  posts: Array<PostItem>;
}

// contract/pages/posts.ts
interface PostsPageProps {
  posts: Array<PostItem>;
  tags: Array<Omit<TagWithCount, "createdAt">>;
  selectedTag?: string;
  onTagClick: (tag: string) => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}
```

For complete type definitions, please consult the [`src/features/theme/contract/pages/`](../src/features/theme/contract/pages/) directory directly.

## Recommended Directory Structure

Taking cues from the default theme (`themes/default/`), the recommended directory layout is as follows:

```
src/features/theme/themes/<your-theme>/
├── index.ts                  # Theme entry point, exports object satisfying ThemeComponents
├── styles/
│   └── index.css             # Theme's private styles (color variables, fonts, typography, etc.)
├── layouts/
│   ├── public-layout.tsx
│   ├── auth-layout.tsx
│   ├── user-layout.tsx
│   ├── navbar.tsx            # Inner sub-components of PublicLayout
│   ├── footer.tsx
│   └── mobile-menu.tsx
├── pages/
│   ├── home/
│   │   ├── page.tsx          # HomePage component
│   │   └── skeleton.tsx      # HomePageSkeleton (optional)
│   ├── posts/
│   ├── post/
│   ├── search/
│   ├── friend-links/
│   ├── submit-friend-link/
│   ├── auth/
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── verify-email/
│   └── user/
│       └── profile/
├── components/               # Inside-theme shared components (optional)
│   ├── content/              # Content rendering components (post body)
│   │   ├── render.tsx        # Tiptap AST → React mapping
│   │   ├── content-renderer.tsx # Wrapper layer
│   │   ├── code-block.tsx    # Code block rendering
│   │   ├── image-display.tsx # Image display
│   │   └── zoomable-image.tsx # Image lightbox
│   └── comments/             # Comment section components (optional, can reuse shared components)
│       ├── view/             # Comment display
│       └── editor/           # Comment editor
└── config.ts                 # Theme static configuration (fetch params: page sizes, related post counts, etc.)
```

## Step-by-step: Creating Your First Theme

### Quick Start: Using the Scaffold Script

Run the following command, enter your theme name (e.g., `my-theme`) when prompted, and it will generate a complete theme directory and placeholder components satisfying the contract under `src/features/theme/themes/`:

```bash
bun run create-theme
```

The script will create all necessary layouts, pages, and skeleton files, with components implemented as placeholders. This allows you to easily replace them with real UI step-by-step. Once complete, follow the prompts to:

1. Register your new theme in `src/features/theme/registry.ts` (see [Registering Your Theme](#step-5-registering-the-theme-and-running) below)
2. Set `THEME=<your-theme>` in `.env` and start development

---

### Manual Creation: Step 1 — Create Theme Directories

If you prefer to start from scratch, optionally create the directories manually:

```bash
mkdir -p src/features/theme/themes/my-theme/layouts
mkdir -p src/features/theme/themes/my-theme/pages
```

### Step 2: Implement Layout Components

Create `layouts/public-layout.tsx` receiving `PublicLayoutProps`:

```tsx
import type { PublicLayoutProps } from "@/features/theme/contract/layouts";

export function PublicLayout({
  children,
  navOptions,
  user,
  isSessionLoading,
  logout,
}: PublicLayoutProps) {
  return (
    <div>
      <nav>
        {navOptions.map((opt) => (
          <a key={opt.id} href={opt.to}>
            {opt.label}
          </a>
        ))}
        {user && <button onClick={logout}>Logout</button>}
      </nav>
      <main>{children}</main>
    </div>
  );
}
```

Similarly, create `layouts/auth-layout.tsx` and `layouts/user-layout.tsx`.

### Step 3: Implement Page Components

Each page imports its corresponding Props type from the contract:

```tsx
// pages/home/page.tsx
import type { HomePageProps } from "@/features/theme/contract/pages";

export function HomePage({ posts }: HomePageProps) {
  return (
    <div>
      <h1>Latest Posts</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  );
}

// Skeleton (displayed during data loading)
export function HomePageSkeleton() {
  return <div>Loading...</div>;
}
```

### Step 4: Create `index.ts`

The theme entry file must default-export an object satisfying `ThemeComponents`, employing the `satisfies` keyword for compile-time validation by TypeScript:

```ts
// src/features/theme/themes/my-theme/index.ts
import type { SiteConfig } from "@/features/config/site-config.schema";
import type { ThemeComponents } from "@/features/theme/contract/components";
import { config } from "./config";
import { PublicLayout } from "./layouts/public-layout";
import { AuthLayout } from "./layouts/auth-layout";
import { UserLayout } from "./layouts/user-layout";
import { HomePage, HomePageSkeleton } from "./pages/home/page";
import Toaster from "@/components/ui/toaster";
// ... remaining imports

export default {
  config,
  getDocumentStyle: (_siteConfig: SiteConfig) => undefined,
  PublicLayout,
  AuthLayout,
  UserLayout,
  HomePage,
  HomePageSkeleton,
  Toaster,
  // ... remaining components
} satisfies ThemeComponents;
```

If your theme needs to map runtime configuration into CSS variables, such as injecting a primary hue from `siteConfig` onto `<html>`, implement `getDocumentStyle`; otherwise just return `undefined`.

If any required components are missing, TypeScript will throw an error here explicitly pinpointing the missing field.

### Step 5: Registering the Theme and Running

Open `src/features/theme/registry.ts` (the theme registry) and perform the following actions:

1. Add your new theme name to `themeNames`.
2. Add the theme's route-level config (`viewTransition`, `pendingMs`) into the `themes` constant.

> [!NOTE]
> `vite.config.ts` automatically syncs the theme list from this file, so you do not need to manually modify the Vite configuration.
> [!TIP]
> The `ThemeRouterConfig` in this file only controls routing behaviors (transition animations, pending delays), do not confuse this with each theme's own `config.ts` (data fetching parameters like page size).

```ts
// src/features/theme/registry.ts
export const themeNames = ["default", "fuwari", "my-theme"] as const;
// ...
export const themes: Record<ThemeName, ThemeRouterConfig> = {
  // ...
  "my-theme": {
    viewTransition: false,
  },
};
```

Then switch themes during build and dev via the `THEME` environment variable.

## Content Rendering Components

Post detail pages require rendering the Tiptap JSON AST into React components. Each theme must implement its own set of content rendering components to control the visual presentation of elements like code blocks and images.

### Must-Implement Files

| File                                      | Description                                                                                            |
| :---------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| `components/content/render.tsx`           | Core mapping: mapping nodes like `image`, `codeBlock`, `tableCell` to the theme's own React components |
| `components/content/content-renderer.tsx` | Wrapper layer, using `useMemo` to call `renderReact`                                                   |
| `components/content/code-block.tsx`       | Code block rendering (syntax highlighting, copy buttons, etc.)                                         |
| `components/content/image-display.tsx`    | Image display (click-to-zoom, captions, etc.)                                                          |
| `components/content/zoomable-image.tsx`   | Image lightbox/zoom interaction                                                                        |

### Crucial: Shared Tiptap Extensions

`render.tsx` must import Tiptap extensions from the shared editor configuration to ensure the renderer can identify all node types supported in post content:

```tsx
// components/content/render.tsx
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { extensions } from "@/features/posts/editor/config";
import { CodeBlock } from "./code-block"; // Theme's own implementation
import { ImageDisplay } from "./image-display"; // Theme's own implementation

export function renderReact(content: JSONContent) {
  return renderToReactElement({
    extensions,
    content,
    options: {
      nodeMapping: {
        image: ({ node }) => <ImageDisplay /* ... */ />,
        codeBlock: ({ node }) => <CodeBlock /* ... */ />,
        // tableCell, tableHeader etc.
      },
    },
  });
}
```

Refer to the full implementations in `themes/default/components/content/` and `themes/fuwari/components/content/`.

## Reusable Shared Code

Themes are independent of one another, but they **can and should** reuse shared infrastructure provided by the framework to avoid reinventing the wheel:

| Can import             | Source                                         | Description                               |
| :--------------------- | :--------------------------------------------- | :---------------------------------------- |
| Blog Default Config    | `@/blog.config`                                | Seeded defaults and fallback values; avoid reading runtime config from it inside theme components |
| Business Queries/Hooks | `@/features/*/queries/`, `@/features/*/hooks/` | TanStack Query factories, business hooks  |
| Schema Types           | `@/features/*/schema`                          | Zod schemas and TypeScript types          |
| Tiptap Editor Config   | `@/features/posts/editor/config`               | Extension list for the post editor        |
| Comment Editor Config  | `@/features/comments/components/editor/config` | Extension list for the comment editor     |
| Common UI Components   | `@/components/common/` (e.g., Turnstile)       | Theme-independent functional components   |
| Utilities/Hooks        | `@/lib/utils`, `@/hooks/*`                     | Common utilities like formatting/debounce |

> **Comments System**: Each theme needs to implement its own comment section UI components (editor, lists, comment items, etc.) under `components/comments/`. The business logic for comments (`@/features/comments/queries/`, `@/features/comments/hooks/`) and editor configuration (`@/features/comments/components/editor/config`) are imported from shared locations; only the UI layer is theme-independent. Refer to the implementations of `themes/default/components/comments/` and `themes/fuwari/components/comments/`.

## Theme-Specific Configuration

Besides the `ThemeConfig` in the theme contract (data fetch parameters defined in `contract/config.ts`), themes can also declare **exclusive configuration items** in `blogConfig`, used for things requiring user customization like image paths and colors. Admin-managed **Settings** store the runtime site configuration, while `blog.config.ts` provides seeded defaults and fallback values.

### Conventions

Add configuration under the `theme` namespace in `src/blog.config.ts`, keyed by the theme name:

```ts
// src/blog.config.ts
export const blogConfig = {
  // ... common configs ...
  theme: {
    fuwari: {
      homeBg: "/images/home-bg.webp",
      avatar: "/images/avatar.png",
    },
    // "my-theme": { ... }
  },
};
```

### Override Strategy

`blog.config.ts` is the fallback source. If admin-managed site settings are enabled, runtime site config is merged on the server over these defaults. In practice:

- editors should update personalization from the admin **Settings** page
- theme components should read runtime values from `siteConfig`
- `blog.config.ts` is best used for initial defaults when introducing new theme fields

### Usage in Components

```tsx
import { useRouteContext } from "@tanstack/react-router";

export function ProfileBackground() {
  const { siteConfig } = useRouteContext({ from: "__root__" });

  return <img src={siteConfig.theme.fuwari.homeBg} alt="" />;
}
```

If you are adding a new theme field that can be overridden from admin settings:

1. provide a default value in `src/blog.config.ts`
2. declare the field in the site-config schema
3. read it from runtime `siteConfig` inside the theme component

> **Why not put it in `ThemeConfig`?** `ThemeConfig` is part of the compile-time contract and is mainly used for route-loader data parameters such as pagination sizes. Fields like image paths, brand labels, and other site-personalization values do not belong to route fetching parameters; placing them in `blogConfig` plus the site-config schema gives you sensible defaults while still allowing runtime overrides from the admin **Settings** page.

## Need to Know

- **Do not modify contract files**: Contracts are formal interfaces between the framework and the themes; business logic depends on their stability. If you have new business requirements that should expose more data, please file an issue or PR.
- **Independence between themes**: Do not cross-reference code among different themes to avoid coupling.
- **Style Isolation**: The project uses a layered styling architecture:
  - `src/styles.css` — Global public styles (TailwindCSS entry, dark/light variants, etc.), shared by all themes. **Themes should not modify this file**.
  - `themes/<your-theme>/styles/` — Theme-private styles (color variables, fonts, typography, component styling). Imported locally via `import "./styles/index.css"` in the theme's `index.ts`, ensuring it is only loaded when that theme is active.
