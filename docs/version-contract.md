# The version contract

What a release level promises a site owner, and the rules a change to this repository follows so the promise holds. Site owners are told the outcome in [docs/deployment.md](./deployment.md) (upgrading, and upgrading across majors); this file is for whoever designs, merges or releases a change. Procedure for cutting the release itself: [docs/agents/release.md](./agents/release.md).

## Decide the level when you design the change

**A change that deletes or irreversibly rewrites site data is a major, so decide the release level when designing the change, not at release time.** By release time the migration is written, merged and tested, and the only choices left are to hold everything else back for a major or to break the promise.

A data change that cannot be undone is one the previous version's code cannot recover from by being deployed again: rows removed, a column dropped or rewritten, content converted in place. A change that only adds (a table, a nullable column, a column with a default) is not.

When the change does not need to be a data change now, split it: ship the expand step in a minor and leave the contraction for the next major. Example from this repo: the legacy `auto` Post Revisions, taken before publishing became the only way to change the public page. Deleting them is irreversible, so the release that introduced the revision limit kept them readable and counting toward the 20, and the deleting migration was moved to the next major ([ADR 0039](./adr/0039-posts-keep-twenty-revisions.md)).

## What each level promises

| Level | Promise | May a site owner sync without reading anything? |
| --- | --- | --- |
| major | Needs manual steps before syncing, or carries a data change that cannot be undone | No: read the upgrade notes first |
| minor | New features, at most optional configuration | Yes |
| patch | Fixes | Yes |

The level comes only from the version numbers; nothing stores it a second time. Going back to the previous version is safe within a major, and that is what the migration rule below protects.

A change is breaking, and so a major, when a site owner has to do something before syncing (change a Build command, re-add a variable as a Secret, move a setting), when it needs configuration that did not exist (a new required Build variable or Secret), or when it deletes or irreversibly rewrites data. Required configuration is held to the same line: a minor or patch whose `unreleased` entry has `requires` fails the release check, because the deploy check reads `requires` only across a major. Make the configuration optional, or release a major.

## What reaches other sites

Forks sync from `main`, and sites learn of an update from the version in `upgrades.json` and the GitHub Release. So `main` moves only by a release: even a small fix reaches other sites as a patch release, never as an untagged fast-forward, which no site's update check would ever see. A prerelease (`bun run release:beta`) is cut the same way as a release but does not move `main`, and `upgrades.json` lists no prerelease.

## Migrations: expand first, contract later

A minor or patch only adds: tables and columns. Dropping a column, changing what a column means, or deleting rows belongs in a major, so the previous version's code keeps running on the migrated database for as long as the major lasts.

Keywords alone cannot tell these apart: SQLite rebuilds a table by creating a new one, copying, dropping the old one and renaming, and several of the migrations in `migrations/` do exactly that. So the release check does not forbid the keywords in a non-major; it makes the author say why it is safe, in a line comment in the migration file:

- `-- rollback-safe: <reason>` is required when the migration uses `DROP` or `RENAME`. The reason says why the previous version's code still runs on the migrated database ("the rebuilt table has the same columns").
- `-- keeps-data: <reason>` is required when the migration uses `DELETE FROM`. The reason says why no site data is lost for good ("the rows are expired reset tokens", "the rows are rebuilt by the next statement"). If the honest reason is that data is lost, the change is a major.

A migration may need both lines. The keywords are read as SQL: a mention inside a comment, a string or a quoted identifier does not count, and a line inside a block comment or a string is not a marker. A marker with no reason after the colon fails like a missing one. Only migrations added since the last release's tag are looked at, so the older ones, some of which delete rows, never fail a later release. A major is not checked: it may do all of this, and carries `before` items instead.

The check makes the author look once; the judgement is theirs.

## `upgrades.json`

One file at the repository root, committed with the code, holding the notes of every release, newest first, plus the next release's `unreleased` entry while it is being built:

```json
{
  "unreleased": { "summary": "…" },
  "versions": [{ "version": "3.14.0", "summary": "…" }]
}
```

- `summary`: one sentence, in Chinese, written for site owners, saying what the release changes for them. Every release needs one.
- `before`: what a site owner must do before syncing to this version, as `{ id, text }` items. A major needs at least one.
- `after`: what to do once this version runs, as `{ id, text }` items.
- `requires`: `{ buildVars, secrets }`, the names of configuration this version needs before it deploys. Majors only.
- `rollback`: optional, `"safe"` or `"unsafe"`, whether the previous version's code still runs on this version's data. Nothing enforces it.

Whoever introduces a breaking change, or required configuration, adds the `before`, `after` and `requires` items to `unreleased` in the same pull request, while they know what a site owner will hit. A minor or patch only needs its `summary`, written before the release. The strict schema (`checkUpgradesFile` in `src/lib/version/upgrades.ts`) refuses unknown keys, and its length limits are frozen because deployed Workers read the newest file with older code: new fields may be added optional, existing ones keep their meaning.

Three things read it:

- The release check (`scripts/release-check.ts`) at the release: it refuses what the contract forbids, stamps `unreleased` with the new version and moves it to the front of `versions`. `main` therefore never has an `unreleased` entry.
- The deploy preflight (`scripts/deploy-preflight.ts`, the first step of `bun run deploy`), reading the copy built into the deployment: when a build crosses a major it stops unless the Build variable `UPGRADE_ACK` holds the new major, prints the `before` items of the versions crossed, and checks `requires`. A stopped build deploys nothing and the site keeps running. A downgrade across majors needs `UPGRADE_ACK` too, and a site installed before the gate existed (no version tag on its Worker) is treated as major 3. The decision table is in `scripts/deploy-preflight-core.ts`, and what a site owner sees is in [docs/deployment.md](./deployment.md).
- The Admin, reading the upstream `main` copy for its update check (`summary` and the items of every version between the running one and the newest, with the level taken from the version numbers) and the built-in copy for the notice after an upgrade (`after` items).

## What fails a release

`bun scripts/release-check.ts <last> <next>` runs from release-it and reports every reason at once. It stops the release when:

- a commit since the last tag is breaking (`type!:` or a `BREAKING CHANGE:` footer, unless a later commit reverts it) and the release is not a major;
- `unreleased` is missing, or has no `summary`, or `upgrades.json` does not match its schema;
- the release is a major and `unreleased` has no `before` items;
- the release is not a major and `unreleased` has `requires`;
- the release is not a major and a migration added since the last tag lacks the `rollback-safe` or `keeps-data` line it needs.

A prerelease is checked the same way and leaves the file as it is; the file lists releases only. The release-check tests (`scripts/release-check-core.test.ts`, `scripts/release-check.test.ts`) hold each rule.
