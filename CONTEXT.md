# Flare Stack Blog

Flare Stack Blog is a Cloudflare Workers-native blog CMS for publishing posts, managing site content, and exposing admin/MCP capabilities around that content.

## Language

**Post**:
A piece of blog content that can be drafted, published, tagged, versioned, indexed for search, and rendered on the public site.
_Avoid_: Article

**Draft Post**:
A **Post** that is editable in admin workflows but should not appear on the public site.
_Avoid_: Unpublished article

**Published Post**:
A **Post** that is eligible for public listing, detail rendering, search indexing, and public cache updates.
_Avoid_: Live article

**Public Content Snapshot**:
The processed version of a published **Post**'s content that the public site reads for rendering and caching.
_Avoid_: publicContentJson, rendered content, cached content

**Post Revision**:
A saved snapshot of a **Post** used to inspect or restore previous editing or publishing state.
_Avoid_: Version, history item, backup

**Tag**:
A reusable non-hierarchical label that groups **Posts**.
_Avoid_: Category

**Comment**:
A user-authored response attached to a **Post**.
_Avoid_: Message

**Comment Thread**:
A root **Comment** plus its direct replies under one **Post**.
_Avoid_: Nested comment tree

**Reply**:
A **Comment** that belongs to a **Comment Thread** and may target either the root comment or another reply for display context.
_Avoid_: Nested reply

**Verifying Comment**:
A **Comment** awaiting automated moderation.
_Avoid_: Pending comment

**Pending Comment**:
A **Comment** awaiting admin review after automated moderation could not publish it automatically.
_Avoid_: Verifying comment

**Media**:
An uploaded file tracked by the CMS for reuse in **Posts**.
_Avoid_: Asset

**Friend Link**:
A submitted or admin-created external site listing that can be approved for display on the public friend-links page.
_Avoid_: Blogroll, partner link, link exchange

**System Config**:
CMS-wide operational settings such as email, notification, and site configuration.
_Avoid_: Settings

**Site Config**:
Public-facing site identity and theme personalization used by the rendered blog.
_Avoid_: System settings

**Theme Contract**:
The boundary that lets public blog pages change presentation without changing routing or content-management logic.
_Avoid_: Skin, template, CSS theme

**MCP Server**:
The OAuth-protected interface that lets external AI clients manage Flare Stack Blog content and **Traffic Metrics** through structured tools.
_Avoid_: Agent API, admin API

**Import/Export Task**:
An asynchronous workflow that moves **Posts** and related content into or out of the CMS while reporting progress.
_Avoid_: Backup job, migration

**Notification Event**:
A comment or friend-link domain event that is delivered through configured email and webhook channels.
_Avoid_: Alert, message

**User**:
A signed-in person who can interact with the blog through comments, profile, and submissions.
_Avoid_: Account

**Admin**:
A **User** with content-management permissions for posts, comments, media, tags, settings, and friend-link review.
_Avoid_: Owner

**Search Index**:
The public search read model built from **Published Posts**.
_Avoid_: Orama index

**Public Cache**:
The cached public read surface for published content and public lists.
_Avoid_: KV cache, CDN cache, sync hash

**Scheduled Publish**:
A future-dated publication of a **Post** that becomes public through a workflow at its planned publish time.
_Avoid_: Future post

**AI Moderation**:
Automated review that decides whether a non-admin **Comment** can be published or must become a **Pending Comment**.
_Avoid_: AI review

**Traffic Metrics**:
Public-site viewing data used for dashboard traffic charts, view counts, top pages, and popular posts.
_Avoid_: Analytics, Pageview

**OAuth Client**:
An external application authorized to access Flare Stack Blog capabilities through the OAuth provider.
_Avoid_: App integration

**OAuth Scope**:
A permission string that limits which blog resources an **OAuth Client** can read or write.
_Avoid_: Role

**Webhook Endpoint**:
A configured external URL that receives selected admin **Notification Events**.
_Avoid_: Webhook, callback URL

## Relationships

- A **Post** can have zero or more **Tags**.
- A **Post** can have zero or more **Post Revisions**.
- A **Post** can have zero or more **Comment Threads**.
- A **Post** can reference zero or more **Media** items.
- A **Published Post** has a **Public Content Snapshot** for public rendering.
- A **Draft Post** does not appear in public listing, detail, or search surfaces.
- A **Post Revision** belongs to exactly one **Post**.
- A **Comment Thread** belongs to exactly one **Post**.
- A **Reply** belongs to exactly one **Comment Thread**.
- A non-admin **Comment** starts as a **Verifying Comment**.
- A **Pending Comment** requires admin review before becoming publicly visible.
- A **Media** item referenced by a **Post** cannot be deleted from the media library.
- Only an approved **Friend Link** appears on the public friend-links page.
- **System Config** contains **Site Config**.
- A **Theme Contract** consumes **Site Config** when rendering public blog pages.
- The **MCP Server** can manage **Posts**, **Comments**, **Tags**, **Media**, **Friend Links**, search, and **Traffic Metrics** through structured tools.
- An **Import/Export Task** can include **Posts** and related content.
- An **Import/Export Task** can preserve **Post** content, frontmatter, and related **Media** depending on the import/export format.
- A **Notification Event** can be delivered through email or **Webhook Endpoints** according to **System Config**.
- An **Admin** can manage **Posts**, **Comments**, **Tags**, **Media**, **System Config**, and **Friend Links**.
- A **User** can create **Comments** and submit **Friend Links**.
- The **Search Index** includes **Published Posts** and excludes **Draft Posts**.
- Publishing, deleting, or retagging a **Published Post** can update the **Public Cache**.
- A **Scheduled Publish** becomes a **Published Post** at its planned publish time.
- **AI Moderation** processes **Verifying Comments**.
- **Traffic Metrics** can rank **Published Posts** as popular posts.
- An **OAuth Client** receives one or more **OAuth Scopes**.
- The **MCP Server** relies on **OAuth Scopes** to limit external client capabilities.
- A **Webhook Endpoint** receives selected admin **Notification Events**.

## Example dialogue

> **Dev:** "When Flare Stack Blog publishes content, which parts become public?"
> **Domain expert:** "Only the published content surface becomes public; drafts and admin-only management state stay behind authenticated workflows."

## Flagged ambiguities

- "Article" may appear in Chinese product discussion as "文章", but glossary, issues, and implementation planning should use **Post**.
- "Category" is not a current Flare Stack Blog concept; use **Tag** for non-hierarchical grouping.
- "Pending comment" and **Verifying Comment** are distinct: **Verifying Comment** is awaiting automated moderation, while **Pending Comment** is awaiting admin review.
- "Asset" can refer to theme or static resource paths; use **Media** for uploaded files managed by the CMS.
