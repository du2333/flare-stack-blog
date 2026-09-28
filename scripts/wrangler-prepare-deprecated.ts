// Kept for one major release so existing Workers Builds configurations that
// still run `bun run wrangler:prepare && bun run build` keep building.
console.log(
  "wrangler:prepare is deprecated and no longer needed: the Worker is now " +
    "configured by cloudflare.config.ts. You can remove it from the build command.",
);
