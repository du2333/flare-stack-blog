import type { Config } from "release-it";

export default {
  // package.json's release scripts set HUSKY=0, so the release's own commit
  // and push run no git hooks: the gates below have just passed (or were
  // recorded) on the tree before the bump, and the release commit only
  // changes the version in package.json and upgrades.json.
  git: {
    commit: true,
    tag: true,
    push: true,
    commitMessage: "chore: release v${version}",
  },
  github: {
    release: true,
    releaseName: "v${version}",
  },
  hooks: {
    // Each gate is skipped when this tree already passed it, at acceptance on
    // the integration branch (scripts/gate.ts).
    "before:init": [
      "bun run i18n:compile",
      "bun run gate check",
      "bun run gate build",
      "bun run gate test:node",
      "bun run gate test",
    ],
    // The version is chosen, package.json not yet written; stamps upgrades.json.
    "before:bump": "bun scripts/release-check.ts ${latestVersion} ${version}",
    "after:release":
      "echo Successfully released ${name} v${version} to ${repo.repository}.",
  },
  plugins: {
    "@release-it/conventional-changelog": {
      preset: {
        name: "conventionalcommits",
        types: [
          { type: "feat", section: "Features" },
          { type: "fix", section: "Bug Fixes" },
          { type: "refactor", section: "Code Refactoring" },
        ],
      },
      ignoreRecommendedBump: true,
    },
  },
} satisfies Config;
