# The Admin page frame

Every Admin page except the post editor and its history renders inside `AdminPage` (`src/components/admin/admin-page.tsx`). The frame owns the title row, the tabs and tools row, the sticky head with its hairline, the phone top bar's title and primary action, and the body's form. A page fills the slots and writes only its body.

```tsx
<AdminPage
  title={m.admin_posts_title()}
  count={total}                      // right after the title, tabular numbers
  description={m.some_hint()}        // optional, one line, only if the page needs it
  primaryAction={{ label, icon, onClick, loading, disabled, ref }}
  actions={<ActionMenu … />}         // secondary, left of the primary one
  tabs={<Tabs … />}                  // row two, left
  tools={<SearchField … />}          // row two, right: search, filter, sort, view
  body="list"                        // "list" | "form" | "split"
>
  …the body…
</AdminPage>
```

- **Row one**: `title`, `count`, `description`, `actions`, `primaryAction`. There is at most one primary action. Below 1024px the top bar shows the title and the primary action instead, and row one keeps only the description and the secondary actions.
- **Row two** (optional): `tabs` and `tools`, under one hairline. Below 1024px the frame puts the tools on their own line under the tabs, full width, and the tabs scroll sideways when they do not fit; a page never wraps row two itself. A page that builds row two itself passes it as `toolbar` and uses `AdminPageToolbar` (or the `.admin-frame-toolbar` row) inside it; see `PostsToolbar`.
- **Primary action from deeper down**: a component inside the body can call `useAdminPrimaryAction(action)` (`admin-chrome.tsx`) instead; the header and the top bar show it while that component is mounted. The API Key tab of 「接入」 does this under the shared header.
- **Head**: rows one and two stay on top while the body scrolls, with a hairline under them.
- **Loading**: render the same `AdminPage` with the real title, `count="—"`, `actions={<FrameActionSkeleton />}` where the primary action will be, and skeleton rows as tall as the real ones (`PostManagerPageSkeleton`).

## Body forms

`body` sets the form; `scroll` says whether the body itself scrolls. It is on for `list` and `form` and off for `split`. A body with scrollers of its own (a pinned footer, two panes) sets `scroll={false}` and gives each scroller `flex: 1; min-height: 0`. A region that runs edge to edge takes `.admin-frame-bleed` and pads itself with `--admin-frame-x`.

| Form | Use it for | Example |
| --- | --- | --- |
| `list` | a list or a dashboard, full width | Overview (`DashboardPage`): body scrolls; Posts (`PostManager`): `scroll={false}`, its own scroller and pinned pagination |
| `form` | settings, one per row | Settings (`SettingsShell`): the `.settings-body` scroller with the save bar pinned at its foot |
| `split` | master and detail | Friend Links (`FriendLinkManager`): the queue and the detail pane scroll on their own |

In a `form` body, put each setting in an `AdminFormRow` (`label`, `description`, `htmlFor`, the control as children): from 1024px the name and description are on the left and the control on the right, at most 480px wide; narrower, they stack. A page with unsaved changes pins its save bar at the foot of the body, as `SettingsShell` does.

Group settings under `AdminFormSection` (`title`, an optional `description`, `status` beside the title, `collapsible` with `summary` for a group that opens in place): the group's title is the section size, a hairline separates groups, and the last row of a group draws none. A setting with a control that needs a name, a description and an error wired up is a `SettingRow` (`src/features/config/components/admin/setting-row.tsx`, `SwitchRow` for an on/off setting, `SettingPart` for one labelled part of a multi-part setting). A multi-part setting (links, an account's fields) is one row whose control column stacks its parts.

In a `list` body, a row is at most 56px tall, has a hairline under it and a light fill under the pointer, the whole row is the link or button, and its actions go into an `ActionMenu` at the end. `.admin-list-row` gives those values. A row's hairline and fill end exactly at the edges of the list or section it is in, at every width: the row pads its own content by `--admin-row-x` (12px), and a list of rows never takes a negative margin to line its text up with a heading, because that pushes the rules past the section and past the page's inset (`--admin-frame-x`). In the overview's right column and the Comments page alike, the text sits 12px inside the rule. An empty list is one sentence and one action (`EmptyState`), as `AdminPlaceholderPage` shows.

## Values

Type and density are variables in `src/styles/admin-variables.css`; read them instead of writing sizes:

- `--admin-text-title` / `--admin-leading-title` 20/28 (page title, semibold), `--admin-text-section` 15/22 (section title, semibold), `--admin-text-body` 14/22, `--admin-text-meta` 12.5/18. Numbers use `font-variant-numeric: tabular-nums`.
- `--admin-row-max` 56px, `--admin-form-control-max` 480px, `--admin-sidebar-width` 232px, `--admin-sidebar-row` 36px, `--admin-sidebar-text` 14px.
- The accent is ink (`--fuwari-primary`, text on it `--admin-on-accent`). Links are ink with an underline. Only success, warning and danger have a hue.

## Navigation and counts

The sidebar's entries and groups are `ADMIN_NAV` in `src/components/admin/admin-nav.ts`. The counts beside 评论 and 友链 come from `useAdminCounts` (`admin-counts.ts`), which reads the unreplied Comments' total and the pending Friend Links through existing queries. Whatever handles a Comment must invalidate `orpc.dashboard.key()` (`refreshUnrepliedComments` does), and whatever reviews a Friend Link must invalidate `orpc.friendLinks.key()`; the counts follow.
