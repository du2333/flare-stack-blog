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
    "before:init": ["bun check", "bun run test", "bun verify-translations"],
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
