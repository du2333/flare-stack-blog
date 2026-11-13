---
name: measure-site
description: Measure a deployed site's loading with Lighthouse and deploy a branch to a rehearsal Worker first. Use when a change claims a loading improvement (first-load JS, FCP, LCP) or risks a regression, and the claim needs numbers from a real deployment.
metadata:
  internal: true
---

# Measure a deployed site

Two scripts: `scripts/rehearse-deploy.ts` puts a commit on a rehearsal Worker, `scripts/measure-site.ts` measures a URL with Lighthouse (mobile preset: Moto G Power, slow 4G, 4x CPU slowdown). Their `--help` lists the flags. Do not write a measuring script of your own; a hand-rolled one is how rounds ended up incomparable.

A local dev server is not a deployment: it ships unminified modules and no compression. Measure a deployed build, or the production build served locally only when the question allows it.

## Setup, once

The rehearsal Worker, its fork and the Cloudflare account are the maintainer's. `bun scripts/rehearse-deploy.ts` without settings prints what to set (environment variables or `~/.config/flare-stack-blog/rehearsal.toml`). If they are not set, ask the user for the rehearsal site's address and measure that, deploying nothing.

Lighthouse is fetched by `bunx` at the version the script pins. Chromium is Playwright's headless shell; `measure-site` prints the install command when it is missing.

## Steps

1. **Baseline.** Deploy the commit the change starts from: `bun scripts/rehearse-deploy.ts <baseline sha>`. It stops, with the reason, when the push did not land, the build failed or the site does not answer. Read its last lines; "Done" is the only success.
2. **Measure it and save the round.** Through the machine lock, so no other agent's install or test suite runs beside it:

   ```bash
   bun run heavy -- bun scripts/measure-site.ts <url> <url> --runs 5 --save <scratch>/baseline.json
   ```

   Use the pages the change touches (the home page and `/posts` for list pages, a Post for the Post body). It prints the Theme, the `modulepreload` count and the load average before the table, and stores them in the round.
3. **Deploy the change** with `rehearse-deploy.ts <change sha>`. Do not touch the site's Theme or settings between the rounds.
4. **Measure against the baseline:** the same command with `--against <scratch>/baseline.json`. It warns when the Themes or the throttling differ; a warning means the comparison is void, so make the rounds alike and measure again.

To learn the noise, measure one unchanged site twice and compare the rounds with `--against`. A difference between baseline and change that is no larger than that is not a result.

## Reading the numbers

Each cell is median (min-max) over the runs. A `!` marks a time metric whose runs scatter by more than a quarter of the median: take more runs or rerun on a quieter machine before drawing a conclusion from it.

Lighthouse rates a metric good at: FCP up to 1.8 s, LCP up to 2.5 s, TBT up to 200 ms, CLS up to 0.1, Speed Index up to 3.4 s, performance score 90 or more. It rates them poor above FCP 3 s, LCP 4 s, TBT 600 ms, CLS 0.25, Speed Index 5.8 s, and a score below 50. The score is a weighted blend of FCP, Speed Index, LCP, TBT and CLS; read the metrics, since one score point can come from any of them.

- The default throttling is `simulate`: Lighthouse loads the page unthrottled and models what slow 4G would do. It is stable between runs, but it models TBT from the main-thread work it saw, so a busy machine still inflates TBT. `--throttling devtools` applies the throttling in Chromium: slower and noisier, use it only to check that the model is not misleading you.
- The script scores one page load from a cold cache. Warm-cache and navigation behaviour are not in it.
- JS transfer and the request count come from Lighthouse's resource summary; "Unused JS" is its `unused-javascript` audit (code that did not execute during the load) and lists only scripts above its size floor, so use it to compare rounds, not as a total.

## Traps

- **A push that failed behind a pipe.** Run `rehearse-deploy.ts` on its own, never through `| tail`; a pipe hides the exit status. The script itself confirms through the GitHub API that the fork's branch is at your commit before it starts a build, and stops otherwise.
- **A busy machine.** A test suite running during a measurement showed main-thread blocking 30% too high. `measure-site.ts` refuses to start while the heavy lock is held or the 1-minute load average is above 2; do not pass `--force` to get a number, wait. Running it under `bun run heavy --` makes it queue for the lock and keep the lock while it measures.
- **A changed Theme.** The Theme changes what loads. Both rounds must print the same `Theme:` line; the user's Theme is theirs to change, not yours.
- **A different set of preloads.** The `modulepreload` count is printed for each round. A change in it is part of the finding if the change touched the routes' preloads; if it did not, something else differed between the rounds.
- **A login with several Cloudflare accounts.** `cf` stops asking which account; the rehearsal settings carry the account id, and the script passes it as `CLOUDFLARE_ACCOUNT_ID`.
