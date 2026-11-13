---
name: audit-agent-skill
description: Black-box audit of the flare-stack-blog Agent Skill and HTTP API on a local instance, by a subagent that reads no source code.
disable-model-invocation: true
metadata:
  internal: true
---

# Audit the Agent Skill

An opus subagent plays an AI agent that has only the installed `flare-stack-blog` Skill and the running blog, and hunts for holes. The lead prepares the instance, dispatches it, cleans up, and turns findings into tickets. `<scratch>` is the session scratchpad.

## 1. Prepare

Done when the branch's Skill is installed, the user's config is aside, and a temporary key answers 200.

1. Install the branch's Skill: `npx -y skills add ./.agents/skills/flare-stack-blog -g -y` (the PromptScript line fails; that target is unused), then `diff ~/.agents/skills/flare-stack-blog/SKILL.md .agents/skills/flare-stack-blog/SKILL.md`.
2. Move the user's real config aside: `mv ~/.config/flare-stack-blog/config.toml ~/.config/flare-stack-blog/config.toml.bak`. It points at production with a real key.
3. `bun run db:migrate:local`, then start the dev server and seed the throwaway Admin as the `run-blog` skill describes; save the cookie to `<scratch>/cookie.txt`.
4. Create a temporary API key and keep its `key` and `id` in `<scratch>/apikey.json`:
   `curl -s -X POST -b "better-auth.session_token=$C" -H "content-type: application/json" -H "origin: http://localhost:3000" -A "Mozilla/5.0" http://localhost:3000/api/auth/api-key/create -d '{"name":"skill-audit-<n>"}'`
5. Create the working directory `<scratch>/skill-audit` with test files: `cover.png` and `cover-v2.png` (two small PNGs of different colours), `not-really.png` (plain text), `scripted.svg` (an SVG holding a `<script>`).

## 2. Dispatch

One opus subagent, background, with the brief below. Fill the regression list from the tickets closed since the last audit (one item per fix, phrased as what to try). Memory is tight: nothing else heavy runs during the audit.

```
You are a black-box auditor. You act as an AI agent that has the "flare-stack-blog" Agent Skill installed. Find holes: places where the skill, the blog's API or its documentation would let an agent go wrong, guess, lose data, leak drafts or secrets, or get surprising results. Be adversarial but realistic. Verify earlier fixes and look for new problems, especially ones the fixes may have introduced.

## Hard rules
- Knowledge sources: only the installed skill (~/.claude/skills/flare-stack-blog/SKILL.md, or the Skill tool) and what the running blog serves over HTTP.
- Do NOT read, grep, list or open anything under /home/kuang/projects/, and do not look for the blog's source anywhere else. Write nothing outside the working directory, except the config file the skill dictates.
- Working directory given by the human: <scratch>/skill-audit (holds cover.png, cover-v2.png, not-really.png, scripted.svg; leave those, delete anything else you create).
- Local throwaway instance: http://localhost:3000, API key <key>. Never send it anywhere else. Other people's posts exist: only modify or delete what you create (prefix titles and names with "AUDIT<n>"), and clean everything up at the end. Run site-wide operations only to verify a finding, and say so.
- Follow the skill as written, including its Discover step; note how much of the API document each task needed.

## Regression checks
<numbered list>

## Broader exploration
The full post lifecycle (create from rich Markdown, round-trip, publish, edit, discard, republish, unpublish, delete), revisions, media (upload, cover, body, replace, delete), categories and tags (assign, rename, delete, public pages), pinning, public surfaces (home, post page, category and tag pages, search, RSS, Atom, JSON Feed, sitemap, JSON-LD) for leaks or injection, the save guard on every write, concurrency (several writes at once), retries and idempotency, and the documentation's accuracy for every operation used. Check whether SKILL.md's rules are complete, correct and current.

## Report (in Chinese)
1. Regression table: each item → 已修复 / 仍有问题, with evidence.
2. New findings ranked by severity, each marked 缺陷 / 文档 / 体验: what you did, what happened (status, short body quote), why it matters, a concrete fix.
3. How reading the API document worked in practice.
4. What worked well.
5. Cleanup confirmation, any site-wide operation run, confirmation you read no source code, and the final config file with the key redacted.
```

## 3. Clean up

Done when the user's setup is exactly as before.

1. Delete the key: `POST /api/auth/api-key/delete` with body `{"keyId":"<id>"}` and the same cookie and headers; the old key must now answer 401.
2. `bun scripts/dev-admin-session.ts cleanup`; check every listed Post belongs to the audit, then `cleanup --yes`.
3. Stop the dev server and any workerd whose cwd is the repo, as `run-blog` describes.
4. Restore the config: `mv ~/.config/flare-stack-blog/config.toml.bak ~/.config/flare-stack-blog/config.toml`, directory mode 700, file mode 600.
5. Reinstall the published Skill: `npx -y skills add https://github.com/du2333/flare-stack-blog/tree/dev/.agents/skills/flare-stack-blog -g -y`, then confirm it matches `git show origin/dev:.agents/skills/flare-stack-blog/SKILL.md`.
6. Delete `<scratch>/cookie.txt` and `<scratch>/apikey.json`.

## 4. Turn findings into tickets

Group findings by the code they touch into sub-issues of the spec (see `docs/agents/issue-tracker.md`). Where a fix depends on existing data (attribute allowlists, slug rules, uniqueness), first check production read-only and write the facts into the ticket. Dispatch with `docs/agents/subagent-brief.md`.
