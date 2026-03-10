---
name: internationalization
description: Internationalization patterns for the Flare Stack Blog using Paraglide-JS. Use when adding new translatable strings, localizing components, or handling locale-specific date/time formatting.
---

# Internationalization (i18n) Patterns

This project uses **Paraglide-JS** (Inlang) for type-safe internationalization. All localized strings are managed in JSON files and compiled into a type-safe runtime.

## Translation Files

Translations are located in the `messages/` directory:
- `messages/zh.json`: Chinese (Default)
- `messages/en.json`: English

### Message Key Naming
Use descriptive, hierarchical keys to avoid collisions:
- `nav_*`: Navigation items (e.g., `nav_home`, `nav_posts`)
- `home_*`: Homepage specific strings
- `posts_*`: Posts list/archive specific strings
- `post_*`: Post detail specific strings
- `friend_links_*`: Friend links page strings
- `format_*`: Shared formatting strings (dates, numbers)

## Usage in Components

### 1. Standard Import
Always use the following import pattern to keep components consistent:

```tsx
import { m } from "@/paraglide/messages";
```

### 2. Basic Strings
Replace hardcoded text with function calls:

```tsx
// Before
<h1>友情链接</h1>

// After
<h1>{m.friend_links_title()}</h1>
```

### 3. Parameters and Plurals
Use parameters for dynamic content and plurals. Define these in the JSON files using Inlang's message format.

**JSON (`en.json`):**
```json
"posts_count": [
  {
    "declarations": [
      "input count",
      "local formattedCountEn = count: number"
    ],
    "match": {
      "count=1": "{formattedCountEn} post",
      "count=*": "{formattedCountEn} posts"
    }
  }
]
```

**TSX:**
```tsx
<span>{m.posts_count({ count: posts.length })}</span>
```

## Zod Schema Validation

Separate Server API validation from Client UI validation:

1. **Server (API)**: Use standard static schemas for `inputValidator`. 
2. **Client (UI)**: Use a factory `(m: Messages) => z.object(...)` for localized form errors. Do NOT use dynamic imports `await import(...)`. Pass the imported `m` object directly in the UI component.

```typescript
// feature.schema.ts
import type { Messages } from "@/lib/i18n";

// 1. Static schema for API
export const SubmitSchema = z.object({ name: z.string().min(1) });

// 2. Factory schema for UI Form
export const createSubmitSchema = (m: Messages) => z.object({ 
  name: z.string().min(1, m.validation_required()) 
}); 
```

## Date and Time Formatting

Do NOT use `Intl.DateTimeFormat` directly in components. Define formatting logic in the translation files to ensure locale-appropriate display.

### 1. Absolute Dates
Use the `format_date` or `format_datetime` keys:

```tsx
// messages/zh.json
"format_date": [
  {
    "declarations": [
      "input date",
      "local formattedDateZh = date: datetime year=numeric month=long day=numeric"
    ],
    "match": { "date=*": "{formattedDateZh}" }
  }
]
```

```tsx
// Component
<span>{formatDate(post.publishedAt)}</span> // Uses m.format_date internally
```

### 2. Relative Time (Time Ago)
Use the `time_ago_*` family of messages. The `formatTimeAgo` utility in `src/lib/utils.ts` handles the logic of selecting the right message based on the duration.

```tsx
// Use the utility which internally calls m.time_ago_minutes, etc.
<span>{formatTimeAgo(post.publishedAt)}</span>
```

## Routing and Metadata

Localize page titles and meta description in the `Route` definition:

```tsx
// src/routes/_public/posts.tsx
export const Route = createFileRoute("/_public/posts")({
  loader: async ({ context }) => {
    return {
      title: m.posts_title(),
      description: blogConfig.description, // Keep user config as-is if global
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.title },
      { name: "description", content: loaderData?.description },
    ],
  }),
});
```

## Best Practices

1. **No Logic in Code**: Move pluralization and date formatting logic into the `.json` files.
2. **Type Safety**: Avoid using `m` with string indexing; use the generated function calls.
3. **ARIA Labels**: Always localize `aria-label`, `placeholder`, and `alt` text.
4. **Fallback Content**: Ensure components handle missing data gracefully with localized fallback strings (e.g., `m.posts_no_posts()`).
5. **Standardized Prefixes**: Use common prefixes for related strings to keep translation files organized.
6. **English Simplification**: When localizing, favor concise English strings (e.g., "Links" instead of "Friend Links") if requested by the user.

## Compilation

After adding new keys to the JSON files, run the compiler to update the type-safe definitions:

```bash
bun paraglide-js compile --project ./project.inlang --outdir ./src/paraglide
```
