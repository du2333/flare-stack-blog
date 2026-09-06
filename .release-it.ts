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
    assets: ["tmp/flare-stack-blog-skills-v${version}.zip"],
  },
  hooks: {
    "before:init": [
      "bun run i18n:compile",
      "bun check",
      "bun run test:node",
      "bun run test",
      "bun run i18n:verify",
    ],
    "before:github:release":
      "mkdir -p tmp && git archive --format=zip --prefix=skills/ -o tmp/flare-stack-blog-skills-v${version}.zip HEAD:.agents/skills",
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
