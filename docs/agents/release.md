# Releasing

Cutting a release, top to bottom. Each step says how to tell it is done. The rules that decide which level a change may ship at are in [docs/version-contract.md](../version-contract.md); a release is a decision of the repository's owner, so run it when asked to, never on your own initiative.

Pushing `dev` deploys the live blog (Workers Builds), and pushing `main` deploys it again, so nothing here is a dry exercise past step 4.

## 1. Choose the level and the range

Take the last released version: `git fetch --tags`, then `git describe --tags --abbrev=0 --match 'v[0-9]*' origin/dev`, without the `v`. Read the commits since it (`git log <tag>..origin/dev --oneline`) and pick `patch`, `minor` or `major` by the contract. The level is chosen by hand: `ignoreRecommendedBump` is set in `.release-it.ts`, so a `feat!` commit does not make a major by itself. The release check below refuses a level the contract forbids, but it cannot tell you to pick a higher one when nothing is marked breaking; a change that deletes or irreversibly rewrites data is a major whether or not a commit says so.

Done when you can name `<last>` and `<next>`.

## 2. Write the `unreleased` entry

`upgrades.json` needs an `unreleased` entry with a one-sentence Chinese `summary`, written for site owners: what the release changes for them, in the style of the entries already in the file. A major also needs `before` items (and `requires`, `after` where they apply); see the contract for the fields.

Commit it on the integration branch before the work is accepted ([subagent-brief.md](./subagent-brief.md)), not at release time. The accepted tree is then the released tree, which is what lets the release skip the gates that tree has already passed (step 5).

Done when `bun scripts/release-check.ts <last> <next> --dry-run` ends with `every check passed` and `would start with` followed by your summary. It takes seconds and writes nothing. If it fails, it lists every reason at once: a breaking commit in a non-major, a missing summary, a major without `before`, `requires` in a minor or patch, a migration added since `<last>` that uses `DROP`/`RENAME` without a `-- rollback-safe: <reason>` line or `DELETE FROM` without a `-- keeps-data: <reason>` line. Fix the cause, never the check.

## 3. Be on a clean `dev`

The checkout is `dev`, equal to `origin/dev`, with a clean working tree (release-it refuses otherwise), and the tag `v<last>` exists locally.

Done when `git status` is clean and `git rev-parse HEAD origin/dev` prints one sha twice.

## 4. Optional: a dry run

`bun run release <level> --ci --dry-run` prints what release-it would do. It is not free of side effects: it really writes the new version into `package.json`. Put it back before the real release, or release-it starts from the wrong version:

```sh
git checkout -- package.json upgrades.json
```

Done when `git status` is clean again.

## 5. Release

```sh
bun run release <patch|minor|major> --ci
```

> **To be adjusted by the lead when ticket #333 lands:** release-it's hooks run the checks and the test suites through `bun run gate <name>`, which skips a check the same clean tree has already passed and takes the heavy lock itself, so a release of an accepted tree runs few or none of them. Say here how to start the command if that changes (for example behind `bun run heavy --`, with which time limit and worker count).

release-it runs the hooks in `.release-it.ts`, among them the release check, which stamps `unreleased` into `versions` in `upgrades.json`; bumps `package.json`; commits `chore: release v<next>` with the stamped file; tags `v<next>`; pushes `dev`, which deploys the live blog through Workers Builds; and creates the GitHub Release with generated English notes. The push passes through `.husky/pre-push`, which for a push to `dev` or `main` runs the build, the bundle budget and the node tests, and refuses a push whose commit is not what this clean working tree has checked out.

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

`main` is a protected release snapshot: it only ever moves by fast-forward to a release commit, and every release moves it, patches included, so that a site that tracks `main` sees the release. From a clean checkout of the release commit:

```sh
git fetch origin
git push origin origin/dev:main
```

GitHub reports the push as bypassing the branch rule, because an admin pushes it; that is expected. The push runs `.husky/pre-push` again.

Done when `git rev-parse origin/main origin/dev` prints one sha twice after another `git fetch origin`.

## 8. Confirm the live blog

The push of `dev` started a Workers Builds run; it deploys the Worker and tags the Worker Version `v<next>` (`bun run deploy` does `cf deploy --tag "v$npm_package_version"`). Wait for the build to finish, then read the tag of the serving version the way the deploy preflight does (`readLiveState` in `scripts/deploy-preflight-core.ts`), with the Worker's name (the `WORKER_NAME` of its build):

```sh
bunx cf workers deployments list --worker <worker>
bunx cf workers versions get <version_id> --worker <worker>
```

The first lists the deployments newest first; take the `version_id` with the largest `percentage` in the first. In the second, `annotations["workers/tag"]` is the tag. Then ask the site: `curl -sI https://<the blog's domain>/` answers 200.

Done when the tag is `v<next>` and the site answers. If the tag is still the old one, the build is not done or failed: open the Worker's **Deployments / Builds**. A build that failed at the deploy preflight deploys nothing and the old version keeps serving.
