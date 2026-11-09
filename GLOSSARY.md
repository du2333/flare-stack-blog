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
The published state of a **Post** that the public site reads for listing, detail, search, and caching. It includes the public title, summary, slug, content, publication date, **Post Cover**, **Category** and **Tags**. Editing or autosaving a **Post** does not change it. Publishing replaces it. Unpublishing discards it.
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

**Current Assignment**:
The **Posts** whose draft is assigned a **Category** or **Tag**, whether or not they are published. Changing it changes the draft only.
_Avoid_: Draft-only usage

**Public Usage**:
The **Published Posts** whose **Public Content Snapshot** assigns a **Category** or **Tag**. It changes when those **Posts** are published or unpublished.
_Avoid_: Live assignment

**Unpublished Changes**:
The differences between a **Published Post**'s draft and its **Public Content Snapshot**. Publishing them replaces the snapshot; discarding them makes the draft match it again.
_Avoid_: Out of sync, dirty, pending edits, 已同步

**Comment**:
A user-authored response attached to a **Post** or a **Moment**, public as soon as it is created, whose body is text. The author or an **Admin** can delete it from the public page it was left on; deletion keeps a placeholder in the **Comment Thread** instead of removing the row.
_Avoid_: Message, pending comment, verifying comment, rich document

**Comment Thread**:
A root **Comment** plus its direct replies under one **Post** or **Moment**. A thread whose root is deleted and that has no published replies is not shown.
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

**Video Embed**:
A block in a **Post** body that plays one video: a Bilibili or YouTube video in that site's own player, or a **Direct Video**.
_Avoid_: Video block, video card, iframe, 视频卡片

**Direct Video**:
The web address of a video file that the reader's browser plays itself, kept with an optional title, poster and the address of the page it was found on. It is not **Media**: the CMS neither stores nor tracks the file and does not know whether it is still there.
_Avoid_: Self-hosted video, uploaded video, external video, video link, 自托管视频, 上传的视频, 外链视频

**Moment**:
A short, untitled piece the **Admin** shares on the public Moments page: text, with either images or one **Video Embed**. It is public as soon as it is posted; editing or deleting it takes effect at once, and no history of it is kept. 中文叫「动态」.
_Avoid_: Status, tweet, note, memo, microblog, short post, 说说, 微博

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

**Sign-in Code**:
A short-lived one-time code emailed to an address so its owner can sign in as the **User** with that email.
_Avoid_: OTP, verification code, magic link, password

**Muted User**:
A **User** an **Admin** has stopped from creating **Comments**. They remain a **User**: they can sign in, edit their profile, submit **Friend Links**, and delete their own **Comments**. Muting applies to every **Post** and **Moment** and lasts until an **Admin** unmutes them.
_Avoid_: Banned user, blocked user, silenced user, banned

**Admin**:
A **User** with content-management permissions for posts, moments, comments, media, tags, settings, friend-link review, muting **Users**, and **API Keys**.
_Avoid_: Owner

**API Key**:
A secret an **Admin** issues so a caller can authenticate as that **Admin** on the HTTP API without a browser session. It carries that Admin's content-management permissions, but it cannot create or revoke **API Keys**.
_Avoid_: Token, bearer, service account, machine user, OAuth client

**Agent Skill**:
The instructions an AI agent installs so it can operate a Flare Stack Blog as an **Admin** over the HTTP API with an **API Key**. It is not part of the deployed CMS.
_Avoid_: MCP, plugin, integration, 插件, 技能包

**Pairing Code**:
A one-time, short-lived code an **Admin** generates in the admin UI so an AI agent can obtain an **API Key** for that **Admin** without the key passing through the conversation. Exchanging it is **Pairing**.
_Avoid_: Device code, invite code, access code, 授权码, 邀请码

**Edit Conflict**:
A save refused because what it would change was saved by someone else after the saver read it. Nothing is written; the saver reads again and decides.
_Avoid_: Version conflict, stale write, merge conflict, 版本冲突

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
The one configured external destination for admin **Notification Events**: a chat bot, a push app, or a receiver the **Admin** runs, each sent the event in its own format.
_Avoid_: Webhook, callback URL, push channel

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
- A **Post**'s **Category** and **Tags** are part of its draft and reach the public site when it is published. Creating, renaming and deleting a **Category** or **Tag** apply at once; public caches may refresh later.
- An **Admin** assigns a **Category** by choosing an existing one while editing a **Post**. Editing a **Post** does not create a **Category**.
- **Categories** and **Tags** are managed on one Admin page.
- Deleting a **Category** is allowed. **Posts** that had it become uncategorized. Deleting a **Tag** removes its Post associations.
- A **Category** is identified by a unique name. **Category** names, **Tag** names and **Post** slugs are unique ignoring case (ß, ẞ and ss are one) and Unicode compatibility forms (fullwidth letters, no-break spaces), and ignoring characters that show nothing, such as a variation selector after an emoji; they are stored as written. Names, slugs and titles hold no control or format characters; summaries hold none besides tab and line breaks. A **Post** slug is never `pinned` or `popular` (the public API's list paths), in any case, and never holds `^`, which the public page cannot open.
- The public site can list **Published Posts** by **Category**, and can apply a **Category** filter and a **Tag** filter together.
- A **Post** can have zero or more **Post Revisions**.
- A **Post** or a **Moment** can have zero or more **Comment Threads**.
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
- Restoring a **Post Revision** first saves the current editable **Post** as a **Post Revision**, then restores the editable content, **Category** and **Tags**. It does not replace or discard the **Public Content Snapshot**.
- Discarding **Unpublished Changes** first saves the current editable **Post** as a **Post Revision**, then writes the draft from the **Public Content Snapshot** and the **Public Usage** of its **Category** and **Tags**. It reads no **Post Revision**, so deleting **Post Revisions** never stops it.
- Publishing with a new slug replaces the **Public Content Snapshot** slug. The previous public slug does not remain reachable.
- A **Published Post** has a publication date for display and listing order. The date is a past or current server date, never a future date. First publication without a date uses server time.
- A **Post Revision** belongs to exactly one **Post**.
- A **Comment Thread** belongs to exactly one **Post** or exactly one **Moment**.
- A **User** can create a **Comment** on a **Post** only if that **Post** has a **Public Content Snapshot**, and on any **Moment**, since a **Moment** is always public; never as a **Muted User**.
- A **Muted User** cannot create a **Comment**.
- Muting a **User** does not change their existing **Comments**.
- An **Admin** mutes or unmutes a **User** from that **User**'s **Comment** on the public page of its **Post** or **Moment**, including a deleted **Comment** placeholder, when the **Comment** still identifies a **User**.
- An **Admin** cannot mute an **Admin**.
- Other readers are not shown that a **User** is a **Muted User**.
- An **Admin** can list current **Muted Users** in order to unmute them. That list is not a **User** directory and does not show **Comment** history.
- Unpublishing a **Post** does not delete its **Comments**. They are not shown on the public site while the **Post** is a **Draft Post**, and they reappear when it is published again.
- Public listings and counts of **Comments** exclude deleted **Comments**, except that a deleted root remains visible as a placeholder when its thread still has published replies, and a deleted reply remains visible as a placeholder in a visible thread.
- A **Reply** notifies the author of the targeted **Comment**, not the rest of the **Comment Thread**. A new root **Comment** by a non-**Admin** notifies the **Admin**.
- A **Reply** belongs to exactly one **Comment Thread**.
- A **Post** body can show **Media** by its path, alone or on the blog's own address, only while that **Media** exists; an image a draft already showed by that path before its **Media** was gone may stay. The same path on another address is an external image.
- A **Media** item cannot be deleted from the media library while it appears in the editable **Post**, in a **Public Content Snapshot**, in a **Post Revision** or in a **Moment**, so restoring a **Post Revision** never brings back a deleted image. Deleting the **Post Revision** releases it.
- A **Post** body can contain zero or more **Video Embeds**.
- A Bilibili or YouTube **Video Embed** can only name a video on that site. A **Direct Video** can be at any HTTPS address.
- A **Direct Video** whose file is no longer served stays in the **Post** and fails to play; the CMS neither prevents nor reports it.
- A **Direct Video** is always a video file. A page whose video is another site's player, not a file, cannot become a **Direct Video**.
- The title and poster of a **Direct Video** are read once, when it is embedded, and kept on the **Video Embed**; the Admin may change them. Readers never wait on the page or host they came from.
- A **Moment** is not a **Post**. It has no title, slug, summary, **Category**, **Tags**, **Post Cover**, draft, **Public Content Snapshot** or **Post Revision**. Readers comment on it as on a **Published Post**.
- Deleting a **Moment** deletes its **Comments** with it; no placeholders remain.
- A **Moment** has text of at most 1000 characters, and either up to 50 images, which are **Media**, or one **Video Embed**, never both. It is never empty.
- A **Moment** keeps the time it was posted; editing it does not change that time.
- The public navigation and the home sidebar show **Moments** only once at least one exists; the **Admin** always sees the Moments page, to post the first one. The home sidebar shows the latest three.
- Only an **Admin**, in the admin's own session or with an **API Key**, posts, edits or deletes a **Moment**.
- **Moments** are not in the **Search Index**. They have a feed of their own, separate from the feed of **Published Posts**.
- A **Media** file name follows the rules of a **Tag** name (trimmed, not empty, no control or format characters) up to 255 characters. Replacing a **Media** file keeps its image type; another type is refused, because the key's extension and the type served at it must agree.
- A user-submitted **Friend Link** belongs to its submitting **User**; review notifications use that **User**’s account email. An admin-created **Friend Link** may have no submitting **User**.
- A rejected **Friend Link** can be revised and resubmitted by its submitting **User**.
- Only an approved **Friend Link** appears on the public friend-links page.
- **System Config** contains **Site Config**.
- **System Config** may include one **Webhook Endpoint**.
- Public blog pages consume **Site Config** when rendering.
- A **Notification Event** can be delivered through email or a **Webhook Endpoint** according to **System Config**.
- A **Notification Event** does not include the email recipient.
- A **Notification Event** for a **Comment** links to that **Comment** on the public page of its **Post** or **Moment**. Where it names a **Post** by its title, it names a **Moment** by the start of its text.
- An **Admin** can manage **Posts**, **Moments**, **Comments**, **Tags**, **Categories**, **Media**, **System Config**, **Friend Links**, **Muted Users**, and **API Keys**.
- An **API Key** belongs to exactly one **Admin**.
- An **Admin** can have zero or more **API Keys**.
- An **API Key** authenticates as its owning **Admin** and has that Admin's content-management permissions.
- An **API Key** cannot create or revoke **API Keys**. Only a signed-in **Admin** in the admin UI can.
- An **Agent Skill** authenticates with an **API Key**, obtained by **Pairing** or given to it by the **Admin**.
- A **Pairing Code** belongs to exactly one **Admin**, can be used once, and expires shortly after it is generated. Only a signed-in **Admin** in the admin UI can generate one; an **API Key** cannot.
- **Pairing** issues an ordinary **API Key** owned by the **Admin** who generated the **Pairing Code**, named after the agent and marked as created by **Pairing**.
- A save of a **Post** that states the read it is based on ends in an **Edit Conflict** if the **Post** was saved since that read, by anyone and for any part of its draft. Pinning is not a save. A save that states no read overwrites.
- Publishing a **Post** can state the read it is based on in the same way, so the **Public Content Snapshot** is the draft that was read.
- The admin editor and the **Agent Skill** always state their read.
- A **System Config** section save based on a stale read also ends in an **Edit Conflict**.
- A save of a **Moment** that states the read it is based on ends in an **Edit Conflict** if the **Moment** was saved since that read; a save that states no read overwrites. The Moments page and the **Agent Skill** always state their read.
- Each **Application Release** publishes the **Agent Skill** that matches it. The admin UI offers the one matching the **Running Application Release**.
- A **User** can create **Comments** and submit **Friend Links**.
- A **User** signs in with GitHub or with a **Sign-in Code**. There are no passwords.
- A **Sign-in Code** for an email that has no **User** creates one; the person chooses that **User**'s public name before the sign-in completes.
- A **Sign-in Code** is offered only when email delivery is configured in **System Config**.
- The **Search Index** includes **Published Posts** and excludes **Draft Posts**.
- Publishing a **Post** updates the **Search Index** from its **Public Content Snapshot**, **Category** and **Tags** included. Unpublishing removes that **Post** from the **Search Index**. Renaming or deleting a **Category** or **Tag** updates the **Search Index** documents of the **Published Posts** in its **Public Usage** at once.
- Publishing, unpublishing or deleting a **Published Post**, and renaming or deleting a **Category** or **Tag**, can update the **Public Cache**.
- The public sidebar lists **Categories** whose **Public Usage** is not empty, ordered by name. It does not list uncategorized.
- The **Search Index** includes the **Category** name of a **Published Post**.
- Creating, renaming and deleting a **Category** or **Tag** take effect at once; there is no draft of a **Category** or **Tag**. Renaming one updates the public label of the **Published Posts** in its **Public Usage**, and deleting one removes it from their **Public Content Snapshots**, without republishing.
- Discarding a **Post**'s **Unpublished Changes** takes a **Post Revision** of the draft first.
- Pinning a **Post** takes effect at once and is not part of its **Public Content Snapshot**; it is set from the post list, not the editor, so everything the editor changes waits for publishing.
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
- 「自托管视频」 is not a glossary term. A video on the Admin's own server is a **Direct Video** like any other; the CMS does not distinguish where a **Direct Video** is hosted.
- "Version" is ambiguous. For Post content, use **Public Content Snapshot** or **Post Revision**. For deployed CMS code, use **Application Release** or **Running Application Release**.
