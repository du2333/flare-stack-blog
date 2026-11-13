# Subagent briefs

A brief is the only context a ticket's subagent gets. Build it from the preamble below plus the ticket-specific part: the issue number, file pointers, decisions already made, and the files other running tickets own. When several tickets share their background, write the preamble and that background once to a file in the scratchpad and start each brief with "read `<file>` first"; the brief then holds only the ticket.

An experiment that may be thrown away needs no issues: each brief carries its own acceptance list. When the experiment is to land, the lead writes its requirements to one spec file, and that file is what the reviewer gets.

## Cutting tickets

- Each ticket owns files. When several tickets must write to one file (a shared stylesheet, a shell), split that file per ticket first or put the shared part into the ticket that blocks the others.
- A blocked-by edge needs a real dependency: the ticket reads the other's output. A new form of a shared component can be built and seen without the page that will use it.
- A repeat-until criterion carries a round limit ("at most two fix rounds").
- A ticket proves its own acceptance items. The exhaustive matrix and the "other pages unchanged" comparison run once, on the integration branch.

## Model and effort

Name the model on every Agent call; a call without one inherits the session model. State each ticket's model in the breakdown you show the user.

- `sonnet`/high: UI with a settled design, well-specified tooling, prototypes, finishing rounds.
- `opus`/high: a contract other tickets build on, a prefactor, security-sensitive server work.
- The session model: only the single hardest piece of a feature.

Run tickets that do not block each other in parallel, each with `isolation: "worktree"`, at most two with dev servers at once.

## Preamble

Copy into every brief and fill the `<…>`:

- **Start**: `git merge --ff-only <integration branch>`, confirm `git log --oneline -1` shows `<sha>`, switch to `ticket/<number>-<slug>`, then `bun run worktree:setup --port <port>` (dependencies, sample data, `.dev.vars`).
- **Read**: `gh issue view <ticket>` (the acceptance list you are measured against) and `gh issue view <spec>`; `AGENTS.md`; `<docs and files for this ticket>`; the `run-blog` skill for the local app and screenshots.
- **Yours / not yours**: `<files this ticket owns>`; do not touch `<files other tickets own>`. If a shared piece lacks something, report it instead of changing it.
- **Evidence**: only this ticket's acceptance items, through `bun run shots`: the pages it changes at 1440, 820 and 390, light and dark, plus the states it adds. Sheets go to `<scratchpad>/t<number>/`. Look at them and fix what is wrong, at most two rounds. A ticket that touches auth, the session, toasts, navigation, loading states or the Admin shell also shows `bun run shots flows` green, with `--only` for the flows it bears on.
- **Checks**: once near the end, `bun run heavy -- bun run check` and `bun run heavy -- bun run test:node --maxWorkers=2`, plus only the workerd test files the change touches (`bun run heavy -- bun run test --maxWorkers=2 <files>`). Targeted files while iterating. No `bun run build`; the lead builds once after merging. The exception is a ticket whose acceptance is a measured size: it builds once at the end (`BUNDLE_SOURCEMAP=1 bun run heavy -- bun run build`) and reports `bun scripts/bundle-report.ts`.
- **Local app**: your own port only; stop the server and run `bun scripts/dev-admin-session.ts cleanup --yes` before finishing.
- **Commits**: small conventional commits in English, no AI attribution or Co-Authored-By trailer; no push, no merge, no PR. A regenerated `src/lib/orpc/contract.generated.json` belongs in the commit.
- **Report** (under 400 words): branch and head; each acceptance item as met or not met with one line of evidence; the sheet paths; what you changed outside your files or beyond the brief, and why.

Conventions are not repeated in the brief: the reviewer holds the diff against `CODING_STANDARDS.md`, and `bun run check` holds the mechanical ones.

## Review

Before a ticket branch is merged, run the `code-review` skill on `<integration branch>..<ticket branch>` with `sonnet` reviewers, giving it the ticket's issue as the spec. Send findings back to the ticket's agent (SendMessage keeps its context) and merge when they are settled. A report's "met" is a claim; the review and the lead's look at the screenshots are the check. An experiment branch is reviewed ticket by ticket too: on the one where the review was left for the end, two regressions reached the integration branch first.

## Acceptance

1. Merge each reviewed ticket branch into the integration branch with `--no-ff`. On a conflict in `contract.generated.json`, run `bun run check` to regenerate it; in description strings keep both sides' facts.
2. After the last merge, one at a time through `bun run heavy --`: `bun run check`, `bun run test:node`, `bun scripts/check-theme-styles.ts` when public styles or Themes could be affected, `bun run build`, the full `bun run test`. The `--maxWorkers=2` cap is for sharing the machine: while a subagent or a dev server of yours is running, keep it; when the lead runs these alone, use `--maxWorkers=6` (the full workerd suite takes about 16 minutes at 2, and nearly all of it is per-file setup that scales with workers).
3. On the integration branch, once: the full screenshot matrix of the changed area, and the comparison that pages outside it are unchanged; when the feature touched auth, the session, toasts, navigation, loading states or the Admin shell, also the full `bun run shots flows`. A change to `vite.config.ts`, code splitting or preloads is checked on the production build (`run-blog` says how), and a claim about loading is measured on a deployment (the `measure-site` skill). Compare two branches from two worktrees on two ports (`run-blog` says why).
4. The user sees UI changes on the local dev server before anything reaches `dev`. Stop preview servers once the user has decided.
