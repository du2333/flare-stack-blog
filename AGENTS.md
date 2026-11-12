# AGENTS.md

Repo-local configuration for engineering skills.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues on `du2333/flare-stack-blog`, with tickets as sub-issues of their spec. See `docs/agents/issue-tracker.md`. Dispatching a ticket to a subagent, reviewing it and accepting it: `docs/agents/subagent-brief.md`.

### Triage labels

This repo uses the default five-state triage vocabulary as GitHub labels. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain doc layout. See `docs/agents/domain.md`.

## Review

A diff is reviewed against `CODING_STANDARDS.md`; `bun run check` is what CI runs short of the build and the tests.

## Cloudflare

Cloudflare operations go through the `cf` CLI (`bunx cf`), a 2026 beta that replaced Wrangler here. Find commands with `bunx cf cli search "<task>"`.
