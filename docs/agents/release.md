# Releasing

Cutting a release, top to bottom. Each step says how to tell it is done. The rules that decide which level a change may ship at are in [docs/version-contract.md](../version-contract.md); a release is a decision of the repository's owner, so run it when asked to, never on your own initiative.

For the owner's blog, a push to `dev` starts the Workers Builds deployment of the live blog; a push to `main` does not. `main` is what forks sync from, so moving it is what makes the release reach other sites. Nothing here is a dry exercise past step 4.

## 1. Choose the level and the range

Take the last stable release: `git fetch --tags`, then `git tag --merged origin/dev --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1`, without the `v`. A prerelease tag such as `v3.15.0-beta.0` is not it (`git describe --match 'v[0-9]*'` would return one). Read the commits since it (`git log <tag>..origin/dev --oneline`) and pick `patch`, `minor` or `major` by the contract. The level is chosen by hand: `ignoreRecommendedBump` is set in `.release-it.ts`, so a `feat!` commit does not make a major by itself. The release check below refuses a level the contract forbids, but it cannot tell you to pick a higher one when nothing is marked breaking; a change that deletes or irreversibly rewrites data is a major whether or not a commit says so.

Done when you can name `<last>` and `<next>`.

## 2. Write the `unreleased` entry

`upgrades.json` needs an `unreleased` entry with a one-sentence Chinese `summary`, written for site owners: what the release changes for them, in the style of the entries already in the file. A major also needs `before` items (and `requires`, `after` where they apply); see the contract for the fields.

Commit it on the integration branch before the work is accepted ([subagent-brief.md](./subagent-brief.md), Acceptance), not at release time. The accepted tree is then the released tree, which is what lets the release skip the gates that tree has already passed (step 5).

Done when `bun scripts/release-check.ts <last> <next> --dry-run` passes: it prints `every check passed` and writes nothing. For an entry that is not yet stamped it also prints `would start with` and your summary; for one already stamped (a rerun after an interrupted release) it says `already stamped` instead. It takes seconds. If it fails, it lists every reason at once: a breaking commit in a non-major, a missing summary, a major without `before`, `requires` in a minor or patch, a migration added since `<last>` that uses `DROP`/`RENAME` without a `-- rollback-safe: <reason>` line or `DELETE FROM` without a `-- keeps-data: <reason>` line. Fix the cause, never the check.

## 3. Be on a clean `dev`

The checkout is `dev`, equal to `origin/dev`, with a clean working tree (release-it refuses otherwise), and the tag `v<last>` exists locally.

Done when `git status` is clean and `git rev-parse HEAD origin/dev` prints one sha twice.

## 4. Optional: a dry run

`bun run release <level> --ci --dry-run` prints the hooks release-it would run, without running them (no gate, no release check). It is not free of side effects: it really writes the new version into `package.json`. Put it back before the real release, or release-it starts from the wrong version:

```sh
git checkout -- package.json upgrades.json
```

Done when `git status` is clean again.

## 5. Release

```sh
bun run release <patch|minor|major> --ci
```

Run it bare, not behind `bun run heavy --`. Each gate takes the heavy lock itself, which also sets the test worker count for the machine; wrapping the release in `heavy` puts its default 1500 s limit around everything and can kill the workerd suite midway.

release-it runs the hooks in `.release-it.ts`. `before:init` runs `bun run i18n:compile`, then the gates `check`, `build`, `test:node` and `test` through `bun run gate <name>`. A gate that already passed on this same clean tree is recorded (under the git common directory, shared by every worktree) and skipped, so on an accepted tree (Acceptance in [subagent-brief.md](./subagent-brief.md)) the release skips `check`, `build` and `test:node`. Acceptance runs `test:changed`, the workerd tests a change can reach, so `test`, the whole suite, runs here: around 16 minutes at two workers, and skipped only when acceptance had to run it too. On a tree that was not accepted, the release runs every gate that is missing. `GATE_FORCE=1` reruns a gate that is recorded as passed. A gate that does run first checks `node_modules` against `bun.lock` (`bun install --frozen-lockfile`, a few seconds) and fails when they disagree; files git ignores, `.dev.vars` among them, are not part of what a record vouches for. Then `before:bump` runs the release check, which stamps `unreleased` into `versions` in `upgrades.json`. release-it then bumps `package.json`; `after:bump` (`scripts/release-changeset.ts`) stops the release if anything but `package.json` and `upgrades.json` differs from the tree the gates passed on. A stop there means the working tree was touched during the release: put the change through acceptance and release again. release-it then commits `chore: release v<next>` with the stamped file, tags `v<next>`, pushes `dev`, which deploys the live blog through Workers Builds, and creates the GitHub Release with generated English notes.

The `release` and `release:beta` scripts set `HUSKY=0`, so the release's own commit and push run no git hook: its gates passed on the tree before the bump, and the `after:bump` check has held the release commit to the version in `package.json` and `upgrades.json`.

Done when the command exits 0 and prints `Successfully released`. Check: `git log --oneline -1` is `chore: release v<next>`, `git tag -l v<next>` prints the tag, `git rev-parse HEAD origin/dev` prints one sha twice, and `gh release view v<next> -R du2333/flare-stack-blog` shows the release. If it stops partway, read which step stopped it; a rerun after the stamp was written passes the release check as "already stamped".

## 6. A minor: Chinese notes

For a patch, keep the generated notes and go to step 7. For a minor, replace the generated English notes of the GitHub Release with Chinese notes written for the blog's users. Keep a copy of the generated notes outside the repository first:

```sh
gh release view v<next> -R du2333/flare-stack-blog --json body -q .body > <scratch>/notes-generated.md
```

Take the format from `gh release view v3.14.0 -R du2333/flare-stack-blog` (and v3.13.0, or v3.1.0, the first one written this way):

- the heading `## [x.y.0](https://github.com/du2333/flare-stack-blog/compare/v<last>...v<next>) (<date>)`;
- `### 新功能` for what a reader or the Admin can now do, `### 问题修复` for fixes, `### 性能优化` when something got faster, and `### 说明` for what the owner needs to know;
- one bullet per item, saying what changed for a reader or an Admin and not what the code does, ending with its commit links in the generated notes' form `([c7e0431](https://github.com/du2333/flare-stack-blog/commit/<full sha>))`; purely internal changes (refactors, tests, tooling) are left out;
- `说明` states whether there is a migration and whether there is new configuration, and anything a site owner will notice (as 3.14.0 does for the revisions that were not trimmed).

Apply it with `gh release edit v<next> -R du2333/flare-stack-blog --notes-file <file>`.

Done when `gh release view v<next> -R du2333/flare-stack-blog` shows the Chinese text.

## 7. Fast-forward `main`

`main` is a protected release snapshot: it only ever moves by fast-forward to a release commit, and every release of a stable version moves it, patches included, so that sites syncing from `main` receive it. A prerelease (`release:beta`) does not move `main`. Moving `main` does not deploy the owner's blog; it is what makes the release reach forks. From a clean checkout of the release commit:

```sh
git fetch origin
HUSKY=0 git push origin origin/dev:main
```

`HUSKY=0` because `.husky/pre-push` would treat a push to `main` as a deploying push and run `typecheck`, `build` and `test:node` on the release commit's tree, which no gate has recorded (the gates ran before the bump) and which is the commit the release just pushed to `dev`. GitHub reports the push as bypassing the branch rule, because an admin pushes it; that is expected.

Done when `git rev-parse origin/main origin/dev` prints one sha twice after another `git fetch origin`.

## 8. Confirm the live blog

The push of `dev` started a Workers Builds run; it deploys the Worker and tags the Worker Version `v<next>` (`bun run deploy` does `cf deploy --tag "v$npm_package_version"`). Wait for the build to finish, then read the tag of the serving version the way the deploy preflight does (`readLiveState` in `scripts/deploy-preflight-core.ts`), with the Worker's name (the `WORKER_NAME` of its build):

```sh
bunx cf workers deployments list --worker <worker>
bunx cf workers versions get <version_id> --worker <worker>
```

The first lists the deployments newest first; take the `version_id` with the largest `percentage` in the first. In the second, `annotations["workers/tag"]` is the tag. Then ask the site: `curl -sI https://<the blog's domain>/` answers 200.

Done when the tag is `v<next>` and the site answers. If the tag is still the old one, the build is not done or failed: open the Worker's **Deployments / Builds**. A build that failed at the deploy preflight deploys nothing and the old version keeps serving.
