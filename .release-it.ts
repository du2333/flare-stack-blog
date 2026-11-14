import type { Config } from "release-it";

export default {
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
    "before:init": [
      "bun run i18n:compile",
      "bun check",
      "bun run test:node",
      "bun run test",
      "bun run i18n:verify",
      "bun run i18n:prune-unused --check",
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
