# Coding standards

Read at review, against a diff. `bun run check` already holds what a machine can judge (lint, formatting, types, translations, raw controls outside `src/components/ui`); this file holds the calls a reviewer has to make.

## Server

- A service function returns `Result<TData, { reason }>` built with `ok` / `err` from `@/lib/error`; it does not throw for an expected failure. The caller switches on `result.error.reason` and ends the switch with `reason satisfies never`.
- Code reaches a service through a Capitalized namespace import (`import * as PostService from "…/posts.service"`) and calls it as `PostService.method()`.
- A request goes data → service → oRPC router. A router holds no query and no business rule; a data function holds no permission check.
- An Admin-only procedure lives in the feature's admin router, and its integration test shows a signed-out caller and a signed-in non-Admin both rejected.
- New server behaviour comes with an integration test that would fail without it. A public output schema gains a field only on purpose; what an Admin sees (handled times, drafts) stays out of public outputs.
- A change to a procedure's shape comes with the regenerated `src/lib/orpc/contract.generated.json`.

## Interface

- A control comes from `src/components/ui`. When a page needs something the primitives lack, the primitive grows; the page does not grow its own.
- An Admin page renders inside `AdminPage` and takes its sizes from the Admin variables (`docs/admin-page-frame.md`). A size literal in an Admin stylesheet needs a reason.
- A **Theme** differs through its shell, its design variables and its recipe only (`docs/adr/0038-themes-are-built-in-shells-chosen-at-runtime.md`, `docs/theme-shell-checklist.md`). Nothing a Theme sets reaches `/admin`.
- A route file imports only plain modules (queries, params, schemas, constants) for anything outside its `component`: `loader`, `head`, `validateSearch`, `beforeLoad` and `staticData` are in the first load of every page, and a hook or component module drags its dependencies (a toast library, an editor) in with it. Put what the loader needs in a module of its own; `bun scripts/bundle-report.ts --check` holds each page to its budget.
- A state the user can reach has a design: empty, loading (a skeleton with the final layout's size), error, and the narrow layout.

## Copy

- Every message exists in each file under `messages/`, placed next to the keys it belongs with.
- Chinese copy is formal written Chinese in a declarative tone, without 你, with names in 「」 and one term per concept (当前草稿, 已发布的版本, 已发布页面, 新版本, 历史版本). English copy says the same thing, not a word-for-word rendering.
- Code, docs and issues use the terms in `GLOSSARY.md`.

## Scope

- A diff stays inside what its ticket asked for. A removed behaviour, a renamed user-facing term or a file outside the ticket's ownership is named in the report, and the reviewer checks it against the ticket.
- Comments say why, at the density of the surrounding file.
- Commits are small conventional commits in English with no AI attribution.
