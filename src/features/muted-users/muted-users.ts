export function isMuted(mutedAt: Date | string | number | null | undefined) {
  return mutedAt != null && mutedAt !== "";
}
