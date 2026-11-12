# The Admin page frame

Every Admin page except the post editor and its history and the overview renders inside `AdminPage` (`src/components/admin/admin-page.tsx`). The frame owns the title row, the tabs and tools row, the sticky head with its hairline, the phone top bar's title and primary action, and the body's form. A page fills the slots and writes only its body.

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
  inset={false}                      // a list whose pieces pad themselves
  loading={isFetching}               // the thin line along the card's top
  stackOnPhone                       // below 768px the page scrolls as one
>
  …the body…
</AdminPage>
```

- **Row one**: `title`, `count`, `description`, `actions`, `primaryAction`. There is at most one primary action. Below 1024px the top bar shows the title and the primary action instead, and row one keeps only the description and the secondary actions.
- **Row two** (optional): `tabs` and `tools`. Tabs (`Tabs`, `TabNav`) in the head take their segmented form, a grey track with a white pill that slides to the current tab, through `TabsVariant`; the unsaved-changes mark and the counts stay. Below 1024px the frame puts the tools on their own line under the tabs, wrapping, and the tabs scroll sideways when they do not fit; a page never wraps row two itself. Neither the tabs nor the row draw a rule: the head's hairline does (below). A page that builds row two itself passes it as `toolbar` and uses `AdminPageToolbar` (or the `.admin-frame-toolbar` row) inside it.
- **Primary action from deeper down**: a component inside the body can call `useAdminPrimaryAction(action)` (`admin-chrome.tsx`) instead; the header and the top bar show it while that component is mounted, and the deepest one wins. When it unmounts, the action it covered (the page's own) comes back. A changed label, state or icon is registered again; the click handler and the ref follow the latest call. The API Key tab of 「接入」 does this under the shared header.
- **Head**: rows one and two stay on top while the body scrolls; row one, row two and the body rise in one after another (`riseOrder` in `rise.ts` with `.admin-rise`, the overview's cards too). `.admin-page-head` draws one hairline as its bottom edge, at every width, whatever the rows hold (a page with no tabs, tools below the tabs, a row that is hidden on a phone); a row inside it never draws a rule of its own.
- **Loading**: render the same `AdminPage` with the real title and skeleton rows as tall as the real ones. Where the head's controls need no data, render them as they are, so they take their real size in every language (`PostManagerPageSkeleton`: the primary action disabled, the tabs without counts, the search and chips still); otherwise `count="—"` and `actions={<FrameActionSkeleton />}`. The overview's `DashboardSkeleton` draws its cards at their sizes with `Skeleton shimmer`.

## Body forms

`body` sets the form; `scroll` says whether the body itself scrolls. It is on for `list` and `form` and off for `split`. A body with scrollers of its own (a pinned footer, two panes) sets `scroll={false}` and gives each scroller `flex: 1; min-height: 0`. A region that runs edge to edge takes `.admin-frame-bleed` and pads itself with `--admin-frame-x`.

| Form | Use it for | Example |
| --- | --- | --- |
| `list` | a list, one card, full width | Posts (`PostManager`): `scroll={false} inset={false} stackOnPhone`, `ListCardColumns`, `ListCardRows` (the scroller) and `ListCardFoot` with `Pagination`; Comments: `PaginationBar` under the rows |
| `form` | settings, one per row | Settings (`SettingsShell`): the `.settings-body` scroller with the save bar pinned at its foot |
| `split` | master and detail | Friend Links (`FriendLinkManager`): the queue and the detail pane scroll on their own |

In a `form` body, put each setting in an `AdminFormRow` (`label`, `description`, `htmlFor`, the control as children): from 1024px the name and description are on the left and the control on the right, at most 480px wide; narrower, they stack. A page with unsaved changes pins its save bar at the foot of the body, as `SettingsShell` does.

Group settings under `AdminFormSection` (`title`, an optional `description`, `status` beside the title, `collapsible` with `summary` for a group that opens in place): the group's title is the section size, a hairline separates groups, and the last row of a group draws none. A setting with a control that needs a name, a description and an error wired up is a `SettingRow` (`src/features/config/components/admin/setting-row.tsx`, `SwitchRow` for an on/off setting, `SettingPart` for one labelled part of a multi-part setting). A multi-part setting (links, an account's fields) is one row whose control column stacks its parts.

In a `list` body, a row is at most `--admin-row-max` (58px) tall, has a hairline under it and a light fill under the pointer, the whole row is the link or button, and its actions go into an `ActionMenu` at the end. `.admin-list-row` gives those values. A row's hairline and fill end exactly at the edges of the list or section it is in, at every width: the row pads its own content by `--admin-row-x` (12px), and a list of rows never takes a negative margin to line its text up with a heading, because that pushes the rules past the section and past the page's inset (`--admin-frame-x`). On the Comments page the text sits 12px inside the rule. An empty list is one sentence and one action (`EmptyState`), as `AdminPlaceholderPage` shows.

## Values

The design variables are `--admin-*` in `src/styles/admin-variables.css` (ADR 0021, amended 2026-11-12); a page or a control reads them instead of writing colours, and the `--fuwari-*` values the shared controls read come from them:

- Surfaces: `--admin-canvas` (the page and the sidebar), `--admin-surface` (a card), `--admin-sunken`. Lines: `--admin-line`, `--admin-line-strong`. Text: `--admin-fg`, `--admin-fg-2` (secondary), `--admin-fg-3` (faint: dates, counts, hints; still 4.5:1 on cards and the canvas). States: `--admin-hover`, `--admin-press`.
- `--admin-ink` with `--admin-on-ink` is the primary button and the current page number. `--admin-accent` (flame orange) is only for what asks for attention: the current navigation icon, pending counts, drafts, charts, focus rings; `--admin-accent-text` is its colour as text and `--admin-accent-soft` its tint. Only success, warning and danger have another hue.
- `--admin-shadow-card`, `--admin-shadow-raised`, `--admin-shadow-pop` (dialogs, the palette, the drawer); radii `--admin-radius-control` (10px: buttons, fields, chips, pills), `--admin-radius-row` (12px: a list row, a track), `--admin-radius-card` (16px); `--admin-ease` and `--admin-ease-soft` for motion. The keyframes `admin-fade` and `admin-pop` open a popup and `admin-rise` brings a page in; `.admin-kbd` (`Kbd`) is a key cap.
- The older names stay as aliases: `--admin-hairline` and `--admin-rule` are `--admin-line`, `--admin-on-accent` is `--admin-on-ink`.

Type and density are variables too; read them instead of writing sizes:

- `--admin-text-title` / `--admin-leading-title` 24/32 (page title, semibold), `--admin-text-section` 15/24 (a section's or a card's title), `--admin-text-body` 14/22, `--admin-text-small` 13/20 (descriptions, controls, hints), `--admin-text-meta` 12.5/18 (dates, counts). A size with no role (the overview's greeting, its hero title, its 40px figure) stays a literal with a comment. Numbers use `font-variant-numeric: tabular-nums`, written with `formatCount`.
- `--admin-page-max` 1400px and `--admin-page-x` 32px (16px below 768px): the widest a page gets and its side inset, the frame's and the overview's. `--admin-row-max` 58px, `--admin-form-control-max` 480px, `--admin-form-max` 960px (the widest a form body's rows and groups get), `--admin-sidebar-width` 248px, `--admin-sidebar-row` 34px, `--admin-sidebar-text` 13.5px.
- Links are ink with an underline: an anchor in a page body that carries `text-(--fuwari-primary)` (or `.text-link`) is underlined by `admin-page.css`; a button, tab, menu item, list row or card is not a text link and is left out.
- A skeleton takes a size from the variable the real thing uses (`FrameActionSkeleton` is `--fuwari-button-height` tall, the height the header gives its button), never a literal beside it.

## The shell

`AdminShell` (`src/components/admin/admin-shell.tsx`) puts the sidebar and the page on one canvas; every page lies on it and draws its own surfaces. The sidebar holds the site's name (it opens the public site), the palette's trigger and the compose button, the navigation (`ADMIN_NAV`) with a white pill that slides to the current entry, and the account menu (colour scheme, sign out). Below 1024px it is a modal `Sheet` opened from the top bar: focus moves in, Escape or the backdrop closes it, focus goes to its close button beside the site's name and back to the menu button when it closes, and it closes on the way to another page. Ctrl/⌘ K, or the trigger, opens `CommandPalette` (`src/components/ui/command-palette.tsx`) with the Admin's commands (`admin-commands.ts`): continue the latest draft, a new Post, every page and the settings sections people look for, the Posts last edited, the colour scheme and the site. The post editor is a workspace of its own, without the shell.

## The list controls

The Posts list's card is the frame's list body; inside it, `src/components/ui/list-card.tsx` gives `ListCardColumns` with `SortHeader` buttons, `ListCardRows` (the scroller; rows rise in with `.fuwari-list-card-row-in`) and `ListCardFoot` with the count and `Pagination`. A list without a foot of its own takes `PaginationBar` (the count on the left, the pages on the right); both read `pageNumbers`. The controls of a list's bar are the shared ones in their Admin forms: `Tabs` (segmented in the head), `SearchField variant="raised" shortcut="/"`, `DropdownMenu variant="chip"` (with `neutral`, the value that filters nothing). An empty or failed list is `EmptyState variant="tile"` with one outline `Button`; placeholders are `Skeleton shimmer`. Buttons on the canvas use the Admin variants `ink` (the frame's primary action), `outline`, `quiet` (and `inverse`, `glass` on the dark hero), on their own scale (`xs` 28px, `sm` 30px, `md` 36px); `IconButton` has `ink` and `quiet`.

## Navigation and counts

The sidebar's entries and groups are `ADMIN_NAV` in `src/components/admin/admin-nav.ts`. The counts beside 评论 and 友链 come from `useAdminCounts` (`admin-counts.ts`), which reads the unreplied Comments' total and the pending Friend Links through existing queries. Whatever handles a Comment must invalidate `orpc.dashboard.key()` (`refreshUnrepliedComments` does), and whatever reviews a Friend Link must invalidate `orpc.friendLinks.key()`; the counts follow.
