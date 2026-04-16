export function parseWranglerJson<T>(output: string) {
  const trimmed = output.trim();

  if (!trimmed) {
    throw new Error("Wrangler returned no JSON output.");
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const candidateIndexes = new Set<number>();

    for (let index = 0; index < trimmed.length; index += 1) {
      const current = trimmed[index];
      const previous = index === 0 ? "\n" : trimmed[index - 1];
      if ((current === "[" || current === "{") && previous === "\n") {
        candidateIndexes.add(index);
      }
    }

    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      candidateIndexes.add(0);
    }

    const candidates = Array.from(candidateIndexes).sort((left, right) => {
      return right - left;
    });

    for (const index of candidates) {
      const candidate = trimmed.slice(index);
      try {
        return JSON.parse(candidate) as T;
      } catch {}
    }
  }

  throw new Error(
    `Failed to parse Wrangler JSON output.\nRaw output:\n${trimmed}`,
  );
}
