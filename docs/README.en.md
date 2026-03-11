<div align="center">

[中文](../README.md) | English

# Flare Stack Blog

A full-stack modern blog CMS based on **Cloudflare Workers**<br>
Deeply integrated with D1, R2, KV, Workflows, and other Serverless services.

[![License](https://img.shields.io/github/license/du2333/flare-stack-blog?style=flat-square)](https://github.com/du2333/flare-stack-blog/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/du2333/flare-stack-blog?style=flat-square)](https://github.com/du2333/flare-stack-blog/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/du2333/flare-stack-blog?style=flat-square)](https://github.com/du2333/flare-stack-blog/network/members)
[![React](https://img.shields.io/badge/React-19-blue?logo=react&style=flat-square)](https://react.dev)
[![TanStack Start](https://img.shields.io/badge/TanStack%20Start-black?logo=tanstack&style=flat-square)](https://tanstack.com/start)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?logo=tailwind-css&style=flat-square)](https://tailwindcss.com)

[Deployment Guide](#deployment-guide) · [Local Development](#local-development) · [Development Guidelines](./error-handling-quickstart.en.md)

</div>

---

> **Note**: This project is designed exclusively for the Cloudflare ecosystem and **only supports** deployment on Cloudflare Workers.

## Previews

<div align="center">
  <img src="./assets/home.png" alt="Home Preview" width="49%">
  <img src="./assets/admin.png" alt="Admin Preview" width="49%">
</div>

## Core Features

- **Post Management** — Rich text editor supporting syntax highlighting, image uploads, and draft/publish workflows.
- **Tagging System** — Flexible post categorization.
- **Comment System** — Supports nested replies, email notifications, and moderation.
- **Friend Links** — User applications, admin moderation, and email notifications.
- **Full-Text Search** — High-performance search powered by Orama.
- **Media Library** — R2 object storage for image management and optimization.
- **Authentication** — GitHub OAuth login with role-based access control.
- **Analytics** — Umami integration for visitor metrics and top posts.
- **AI Integration** — Cloudflare Workers AI integration.
- **Theme System** — Extensible theme templates, fully supporting replacement of all pages and layouts.
- **Import / Export** — Supports Markdown import and export, preserving images and frontmatter.

## Tech Stack

### Cloudflare Ecosystem

| Service         | Purpose                                                       |
| :-------------- | :------------------------------------------------------------ |
| Workers         | Edge computing and hosting                                    |
| D1              | SQLite database                                               |
| R2              | Object storage (media files)                                  |
| KV              | Caching layer                                                 |
| Durable Objects | Distributed rate limiting                                     |
| Workflows       | Asynchronous tasks (content moderation, scheduled publishing) |
| Queues          | Message queues (email notifications)                          |
| Workers AI      | AI capabilities                                               |
| Images          | Image optimization                                            |

### Frontend

- **Framework**: React 19 + TanStack Router/Query
- **Styling**: TailwindCSS 4
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts

### Backend

- **Gateway Layer**: Hono (auth routes, media services, cache control)
- **Business Layer**: TanStack Start (SSR, Server Functions)
- **Database**: Drizzle ORM + drizzle-zod
- **Authentication**: Better Auth (GitHub OAuth)

### Editor

TipTap Rich Text + Shiki Syntax Highlighting

### Directory Structure

```
src/
├── features/
│   ├── posts/                  # Post management (other modules share similar structure)
│   │   ├── api/                # Server Functions (Public APIs)
│   │   ├── data/               # Data access layer (Drizzle queries)
│   │   ├── posts.service.ts    # Business logic
│   │   ├── posts.schema.ts     # Zod Schemas + Cache Key Factories
│   │   ├── components/         # Feature-specific components
│   │   ├── queries/            # TanStack Query Hooks
│   │   └── workflows/          # Cloudflare Workflows
│   ├── comments/    # Comments, nested replies, moderation
│   ├── tags/        # Tag management
│   ├── media/       # Media uploads, R2 storage
│   ├── search/      # Orama full-text search
│   ├── auth/        # Authentication, permission control
│   ├── dashboard/   # Admin dashboard statistics
│   ├── email/       # Email notifications (Resend)
│   ├── cache/       # KV caching services
│   ├── config/      # Blog configurations
│   ├── friend-links/# Friend links (applications, moderation)
│   ├── import-export/# Markdown importing/exporting
│   ├── version/     # Version update checker
│   ├── theme/       # Theme system (Contracts, registry, theme implementations)
│   └── ai/          # Workers AI integration
├── routes/
│   ├── _public/     # Public pages (Home, post lists/details, search)
│   ├── _auth/       # Login/Registration related pages
│   ├── _user/       # User specific pages
│   ├── admin/       # Management backend (posts, comments, media, tags, settings)
│   ├── rss[.]xml.ts     # RSS Feed
│   ├── sitemap[.]xml.ts # Sitemap
│   └── robots[.]txt.ts  # Robots.txt
├── components/      # UI components (ui/, common/, layout/, tiptap-editor/)
├── lib/             # Infrastructure (db/, auth/, hono/, middlewares)
└── hooks/           # Custom React Hooks
```

### Theme System

All user-facing pages and layouts in Flare Stack Blog are decoupled from business logic via a **Theme Contract**. You can completely replace the visual presentation layer of the blog without modifying any routing or data logic.

→ **[Theme Development Guide](./theme-guide.en.md)** — Learn how to build your first custom theme from scratch.

#### Available Themes

For the configuration parameters of each theme, please refer to `src/blog.config.ts`.

<table>
  <tr>
    <th>Theme</th>
    <th>Preview</th>
  </tr>
  <tr>
    <td><code>default</code></td>
    <td><img src="./assets/home.png" alt="Default theme preview" /></td>
  </tr>
  <tr>
    <td><code>fuwari</code></td>
    <td><img src="./assets/fuwari.png" alt="Fuwari theme preview" /></td>
  </tr>
</table>

> Contributions are highly welcome! Built a custom theme following the [Theme Development Guide](./theme-guide.en.md)? Feel free to submit a PR to list your theme here.

### Request Flow

```
Request → Cloudflare CDN (Edge Cache)
             ↓ Miss
          server.ts (Hono Entry)
             ├── /api/auth/* → Better Auth
             ├── /images/*   → R2 Media Service
             └── Others      → TanStack Start
                                  ↓
                             Middleware Injection (db, auth, session)
                                  ↓
                             Route Matching + Loader Execution
                                  ↓
                      KV Cache ←→ Service Layer ←→ D1 Database
                                  ↓
                             SSR Rendering (with cache headers)
```

## Deployment Guide

Please refer to the **[Flare Stack Blog Deployment Guide](./deployment-guide.en.md)** for comprehensive structural steps, addressing Cloudflare resource orchestration, credentials procurement, GitHub OAuth configurations, and detailed visual and written setups for both automated deployment approaches along with troubleshooting.

---

## Environment Variables Reference

| File        | Purpose                                                       |
| :---------- | :------------------------------------------------------------ |
| `.env`      | Client-side variables (`VITE_*`), read by Vite                |
| `.dev.vars` | Server-side variables, injected into Worker `env` by Wrangler |

### Required

| Variable                     | Scope   | Description                                                          |
| :--------------------------- | :------ | :------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`       | CI/CD   | Cloudflare API Token (Worker deployment + D1 read/write permissions) |
| `CLOUDFLARE_ACCOUNT_ID`      | CI/CD   | Cloudflare Account ID                                                |
| `D1_DATABASE_ID`             | CI/CD   | D1 Database ID                                                       |
| `KV_NAMESPACE_ID`            | CI/CD   | KV Namespace ID                                                      |
| `BUCKET_NAME`                | CI/CD   | R2 Bucket Name                                                       |
| `BETTER_AUTH_SECRET`         | Runtime | Session encryption key. Generate using `openssl rand -hex 32`        |
| `BETTER_AUTH_URL`            | Runtime | Application URL (e.g., `https://blog.example.com`)                   |
| `ADMIN_EMAIL`                | Runtime | Administrator's email address                                        |
| `GITHUB_CLIENT_ID`           | Runtime | GitHub OAuth Client ID                                               |
| `GITHUB_CLIENT_SECRET`       | Runtime | GitHub OAuth Client Secret                                           |
| `CLOUDFLARE_ZONE_ID`         | Runtime | Cloudflare Zone ID                                                   |
| `CLOUDFLARE_PURGE_API_TOKEN` | Runtime | API token with Purge CDN permissions                                 |
| `DOMAIN`                     | Runtime | Blog's domain (e.g., `blog.example.com`)                             |

### Optional

| Variable                  | Scope      | Description                                                                                              |
| :------------------------ | :--------- | :------------------------------------------------------------------------------------------------------- |
| `THEME`                   | Build-time | Theme name, defaults to `default`. Refer to [Available Themes](#available-themes).                       |
| `TURNSTILE_SECRET_KEY`    | Runtime    | Cloudflare Turnstile Secret Key for CAPTCHA.                                                             |
| `VITE_TURNSTILE_SITE_KEY` | Build-time | Cloudflare Turnstile Site Key.                                                                           |
| `GITHUB_TOKEN`            | Runtime    | GitHub API Token (for version updates checking to avoid rate limits).                                    |
| `LOCALE`                  | Runtime    | Default language: `zh` or `en`. Default: `zh`. Used for emails, webhooks, and background task messaging. |
| `CDN_DOMAIN`              | Runtime    | Standalone CDN domain (e.g., `cdn.example.com`), preferentially used during purge.                       |
| `UMAMI_SRC`               | Runtime    | Umami base URL (Cloud: `https://cloud.umami.is`).                                                        |
| `UMAMI_API_KEY`           | Runtime    | Umami Cloud API key (for Cloud version exclusively).                                                     |
| `UMAMI_USERNAME`          | Runtime    | Umami username (Self-hosted exclusively).                                                                |
| `UMAMI_PASSWORD`          | Runtime    | Umami password (Self-hosted exclusively).                                                                |
| `VITE_UMAMI_WEBSITE_ID`   | Build-time | Umami Website ID.                                                                                        |
| `VITE_BLOG_TITLE`         | Build-time | Blog title.                                                                                              |
| `VITE_BLOG_NAME`          | Build-time | Blog short name.                                                                                         |
| `VITE_BLOG_AUTHOR`        | Build-time | Author name.                                                                                             |
| `VITE_BLOG_DESCRIPTION`   | Build-time | Blog description.                                                                                        |
| `VITE_BLOG_GITHUB`        | Build-time | GitHub homepage link.                                                                                    |
| `VITE_BLOG_EMAIL`         | Build-time | Contact email.                                                                                           |
| `VITE_FUWARI_HOME_BG`     | Build-time | Default home background path for the Fuwari theme (`/images/home-bg.webp`).                              |
| `VITE_FUWARI_AVATAR`      | Build-time | Default avatar image path for the Fuwari theme (`/images/avatar.png`).                                   |

---

## Local Development

### Prerequisites

- [Bun](https://bun.sh) >= 1.3
- A Cloudflare account (For remote D1/R2/KV resource simulations)

### Quick Start

```bash
# Install dependencies
bun install

# Configure environment variables
cp .env.example .env            # Client-side variables
cp .dev.vars.example .dev.vars  # Server-side variables

# Configure Wrangler
cp wrangler.example.jsonc wrangler.jsonc
# Edit wrangler.jsonc to insert your Cloudflare resource IDs

# Start development server
bun dev
```

### Logging into the Admin Backend

**Method 1: Email and Password Registration (No third-party service required)**

1. Visit `http://localhost:3000`'s registration page and register using the `ADMIN_EMAIL` configured in `.dev.vars`.
2. In the development environment, the verification email won't actually be sent. A link will be printed directly in the terminal console — copy and visit it to complete verification.
3. Post-verification involves automatic login, with the system granting admin privileges matched by `ADMIN_EMAIL`.

**Method 2: GitHub OAuth**

1. Navigate to [GitHub Developer Settings](https://github.com/settings/developers) to generate a new OAuth App.
2. Homepage URL: `http://localhost:3000`, Authorization callback URL: `http://localhost:3000/api/auth/callback/github`.
3. Input Client ID and Client Secret configurations into `.dev.vars`.

### Common Commands

| Command         | Definition                                       |
| :-------------- | :----------------------------------------------- |
| `bun dev`       | Starts local dev server (default port 3000)      |
| `bun run build` | Builds the production bundle                     |
| `bun run test`  | Runs the test suites                             |
| `bun lint`      | Runs the ESLint checker                          |
| `bun check`     | Initiates Type checking + Lint + Code formatting |

### Database Commands

| Command           | Definition                                           |
| :---------------- | :--------------------------------------------------- |
| `bun db:studio`   | Invokes the Drizzle Studio visual database interface |
| `bun db:generate` | Generates schema migration files                     |
| `bun db:migrate`  | Applies migrations to a connected remote D1 instance |

### Simulating Cloudflare Resources Locally

The default workspace connects to remote D1/R2/KV resources. If an entirely local ecosystem is needed, simply remove `remote: true` from `wrangler.jsonc` entries, allowing Miniflare to simulate these interfaces natively:

```jsonc
{
  "d1_databases": [{ "binding": "DB", ... }],  // remove "remote": true
  "r2_buckets": [{ "binding": "R2", ... }],    // remove "remote": true
  "kv_namespaces": [{ "binding": "KV", ... }]  // remove "remote": true
}
```

> **Note**: Locally simulated data is not synced remotely to Cloudflare, rendering it safe for exploratory setups. Apply local database migrations directly utilizing:
>
> ```bash
> wrangler d1 migrations apply DB
> ```

## Contributing

We enthusiastically welcome all code contributions, issues, and feature suggestions! Please examine [CONTRIBUTING.en.md](./CONTRIBUTING.en.md) to gather deeper contextualization around development patterns.

Prior to modifying fundamental layers, we warmly advise reading [Error Handling Quickstart](./error-handling-quickstart.en.md).
