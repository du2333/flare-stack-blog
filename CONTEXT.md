# Flare Stack Blog

Flare Stack Blog is a Cloudflare Workers-native blog CMS for publishing posts and managing site content.

## Language

**Post**:
A piece of blog content that can be drafted, published, tagged, versioned, indexed for search, and rendered on the public site.
_Avoid_: Article

**Draft Post**:
A **Post** with no **Public Content Snapshot**. It is editable in admin workflows and does not appear on the public site.
_Avoid_: Unpublished article

**Published Post**:
A **Post** that has a **Public Content Snapshot** and therefore appears in public listing, detail rendering, search indexing, and public cache updates. Publication is immediate; there is no scheduled or future publication. Draft versus published is the result of publish and unpublish, not a separate field the Admin sets and later syncs.
_Avoid_: Live article, scheduled post, future post

**Public Content Snapshot**:
The published state of a **Post** that the public site reads for listing, detail, search, and caching. It includes the public title, summary, slug, content, tags, **Category**, publication date, pin state, and **Post Cover**. Editing or autosaving a **Post** does not change it. Publishing replaces it. Unpublishing discards it.
_Avoid_: publicContentJson, rendered content, cached content, live version, working copy

**Post Revision**:
A snapshot of the **Post** the **Admin** is editing, taken when publishing or immediately before restoring another **Post Revision**. Inspecting one shows that snapshot in the editor without changing the **Post** until restore. Autosave does not create one.
_Avoid_: Version, history item, backup, auto snapshot

**Tag**:
A reusable non-hierarchical label that groups **Posts**.
_Avoid_: Label, topic

**Category**:
An exclusive, non-hierarchical grouping of **Posts**. A **Post** has at most one **Category**.
_Avoid_: Section, channel, folder, taxonomy, 栏目

**Comment**:
A user-authored response attached to a **Post**, public as soon as it is created, whose body is text. The author or an **Admin** can delete it from the public post page; deletion keeps a placeholder in the **Comment Thread** instead of removing the row.
_Avoid_: Message, pending comment, verifying comment, rich document

**Comment Thread**:
A root **Comment** plus its direct replies under one **Post**. A thread whose root is deleted and that has no published replies is not shown.
_Avoid_: Nested comment tree

**Reply**:
A **Comment** that belongs to a **Comment Thread** and may target either the root comment or another reply for display context.
_Avoid_: Nested reply

**Media**:
An uploaded file tracked by the CMS for reuse in **Posts**.
_Avoid_: Asset

**Post Cover**:
The optional cover **Media** of a **Post**. It is not a body image and not the site-wide banner.
_Avoid_: Banner, thumbnail, featured image, hero, OG image, 封面图

**Friend Link**:
A submitted or admin-created external site listing that can be approved for display on the public friend-links page.
_Avoid_: Blogroll, partner link, link exchange

**System Config**:
The single CMS-wide configuration for site presentation and notification delivery. It contains Site Config and delivery settings; API Keys and the results of maintenance operations are separate.
_Avoid_: Settings

**Site Config**:
Public-facing site identity and presentation personalization used by the rendered blog.
_Avoid_: System settings

**Notification Event**:
A comment or friend-link domain event. Email and a **Webhook Endpoint** can deliver it; the event itself does not include the recipient mailbox.
_Avoid_: Alert, message

**User**:
A signed-in person who can interact with the blog through comments, profile, and submissions.
_Avoid_: Account

**Muted User**:
A **User** an **Admin** has stopped from creating **Comments**. They remain a **User**: they can sign in, edit their profile, submit **Friend Links**, and delete their own **Comments**. Muting applies to every **Post** and lasts until an **Admin** unmutes them.
_Avoid_: Banned user, blocked user, silenced user, banned

**Admin**:
A **User** with content-management permissions for posts, comments, media, tags, settings, friend-link review, muting **Users**, and **API Keys**.
_Avoid_: Owner

**API Key**:
A secret an **Admin** issues so a caller can authenticate as that **Admin** on the HTTP API without a browser session. It carries that Admin's content-management permissions, but it cannot create or revoke **API Keys**.
_Avoid_: Token, bearer, service account, machine user, OAuth client

**Search Index**:
The public search read model built from **Published Posts**.
_Avoid_: Orama index

**Public Cache**:
The cached public read surface for published content and public lists.
_Avoid_: KV cache, CDN cache, sync hash

**Post Popularity Snapshot**:
A periodically refreshed ranking of **Published Posts** that received public views during the previous 30 complete calendar days. It orders eligible Posts by view count for public presentation and is not a general-purpose record of site traffic.
_Avoid_: Traffic Metrics, Analytics, Pageview

**Webhook Endpoint**:
A configured external URL that receives admin **Notification Events**.
_Avoid_: Webhook, callback URL

**Application Release**:
A stable Flare Stack Blog release published by the official upstream project and identified by a `vMAJOR.MINOR.PATCH` version. Fork releases, prereleases, and unreleased commits are not **Application Releases**.
_Avoid_: Version, latest commit, prerelease

**Running Application Release**:
The **Application Release** version embedded in the deployed CMS build. It identifies deployed application code, not a **Post Revision**.
_Avoid_: Current version, build commit, Post version

**Available Update**:
The state in which the newest **Application Release** has a greater semantic version than the **Running Application Release**.
_Avoid_: New commit, fork update

## Relationships

- A **Post** can have zero or more **Tags**.
- A **Post** has at most one **Category**.
- A **Category** can group zero or more **Posts**.
- A **Post** with no **Category** is uncategorized. Uncategorized is not a **Category**.
- Publishing a **Post** writes its **Category** into the **Public Content Snapshot**. Autosave does not. A snapshot with no **Category** is uncategorized.
- An **Admin** assigns a **Category** by choosing an existing one while editing a **Post**. Editing a **Post** does not create a **Category**.
- **Categories** and **Tags** are managed on one Admin page.
- Deleting a **Category** is allowed. **Posts** that had it become uncategorized. A **Public Content Snapshot** whose **Category** no longer exists is uncategorized.
- A **Category** is identified by a unique name.
- The public site can list **Published Posts** by **Category**, and can apply a **Category** filter and a **Tag** filter together.
- A **Post** can have zero or more **Post Revisions**.
- A **Post** can have zero or more **Comment Threads**.
- A **Post** can reference zero or more **Media** items.
- A **Post** has zero or one **Post Cover**.
- A **Post Cover** is a **Media** item.
- Publishing a **Post** writes its **Post Cover** into the **Public Content Snapshot**. Autosave does not.
- Clearing a **Post Cover** does not delete the **Media**.
- A **Media** item may be both a **Post Cover** and a body image of the same **Post**. Clearing the **Post Cover** does not remove that image from the body; removing it from the body does not clear the **Post Cover**.
- Restoring a **Post Revision** restores its **Post Cover**. If that **Media** no longer exists, the restored **Post** has no usable **Post Cover**.
- Restoring a **Post Revision** restores its **Category**. If that **Category** no longer exists, the restored **Post** has no **Category**.
- A **Published Post** has a **Public Content Snapshot** for public rendering.
- A **Draft Post** does not appear in public listing, detail, or search surfaces.
- Publishing a **Post** replaces its **Public Content Snapshot** from the Post the **Admin** is editing and creates a **Post Revision**. Publishing again is safe: it replaces the snapshot and updates the **Search Index** and **Public Cache**.
- Autosave does not create a **Post Revision**.
- Editing or autosaving a **Post** does not update the **Public Content Snapshot**.
- Unpublishing a **Published Post** discards its **Public Content Snapshot**, making it a **Draft Post**, and removes it from public listing, detail, and search.
- Restoring a **Post Revision** first saves the current editable **Post** as a **Post Revision**, then writes the chosen snapshot into the **Post** the **Admin** is editing. It does not replace or discard the **Public Content Snapshot**.
- Publishing with a new slug replaces the **Public Content Snapshot** slug. The previous public slug does not remain reachable.
- A **Published Post** has a publication date for display and listing order. The date is a past or current server date, never a future date. First publication without a date uses server time.
- A **Post Revision** belongs to exactly one **Post**.
- A **Comment Thread** belongs to exactly one **Post**.
- A **User** can create a **Comment** only if that **Post** has a **Public Content Snapshot** and the **User** is not a **Muted User**.
- A **Muted User** cannot create a **Comment**.
- Muting a **User** does not change their existing **Comments**.
- An **Admin** mutes or unmutes a **User** from that **User**'s **Comment** on the public **Post** page, including a deleted **Comment** placeholder, when the **Comment** still identifies a **User**.
- An **Admin** cannot mute an **Admin**.
- Other readers are not shown that a **User** is a **Muted User**.
- An **Admin** can list current **Muted Users** in order to unmute them. That list is not a **User** directory and does not show **Comment** history.
- Unpublishing a **Post** does not delete its **Comments**. They are not shown on the public site while the **Post** is a **Draft Post**, and they reappear when it is published again.
- Public listings and counts of **Comments** exclude deleted **Comments**, except that a deleted root remains visible as a placeholder when its thread still has published replies, and a deleted reply remains visible as a placeholder in a visible thread.
- A **Reply** notifies the author of the targeted **Comment**, not the rest of the **Comment Thread**. A new root **Comment** by a non-**Admin** notifies the **Admin**.
- A **Reply** belongs to exactly one **Comment Thread**.
- A **Media** item cannot be deleted from the media library while it appears in the editable **Post** or in a **Public Content Snapshot**. **Post Revision**s do not keep **Media** from being deleted.
- Only an approved **Friend Link** appears on the public friend-links page.
- **System Config** contains **Site Config**.
- **System Config** may include one **Webhook Endpoint**.
- Public blog pages consume **Site Config** when rendering.
- A **Notification Event** can be delivered through email or a **Webhook Endpoint** according to **System Config**.
- A **Notification Event** does not include the email recipient.
- A **Notification Event** for a **Comment** links to that **Comment** on the public **Post** page.
- An **Admin** can manage **Posts**, **Comments**, **Tags**, **Categories**, **Media**, **System Config**, **Friend Links**, **Muted Users**, and **API Keys**.
- An **API Key** belongs to exactly one **Admin**.
- An **Admin** can have zero or more **API Keys**.
- An **API Key** authenticates as its owning **Admin** and has that Admin's content-management permissions.
- An **API Key** cannot create or revoke **API Keys**. Only a signed-in **Admin** in the admin UI can.
- A **User** can create **Comments** and submit **Friend Links**.
- The **Search Index** includes **Published Posts** and excludes **Draft Posts**.
- Publishing a **Post** updates the **Search Index** from the **Public Content Snapshot**. Unpublishing removes that **Post** from the **Search Index**.
- Publishing, deleting, or retagging a **Published Post** can update the **Public Cache**.
- The public sidebar lists **Categories** that appear on at least one **Published Post**, ordered by name. It does not list uncategorized.
- The **Search Index** includes the **Category** name of a **Published Post**.
- Renaming a **Category** updates the public label of **Published Posts** that already include that **Category**, without republishing.
- A **Post Popularity Snapshot** ranks **Published Posts** for public presentation.
- A **Post Popularity Snapshot** older than seven days does not rank **Published Posts**.
- A **Webhook Endpoint** receives admin **Notification Events**.
- An **Available Update** is determined only from official stable **Application Releases**.

## Example dialogue

> **Dev:** "When Flare Stack Blog publishes content, which parts become public?"
> **Domain expert:** "Only the published content surface becomes public; drafts and admin-only management state stay behind authenticated workflows."

## Flagged ambiguities

- "Article" may appear in Chinese product discussion as "文章", but glossary, issues, and implementation planning should use **Post**.
- Chinese「分类」is **Category**, not **Tag**.
- "Asset" can refer to theme or static resource paths; use **Media** for uploaded files managed by the CMS.
- "封面图", "banner", "featured image", and "OG image" are not glossary terms. Per-Post cover is **Post Cover**. The site-wide Fuwari banner is **Site Config** `theme.fuwari.homeBg`.
- "Version" is ambiguous. For Post content, use **Public Content Snapshot** or **Post Revision**. For deployed CMS code, use **Application Release** or **Running Application Release**.
