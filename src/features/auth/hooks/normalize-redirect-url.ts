export function normalizeRedirectUrl(
  redirectTo: string | undefined,
  fallback: string,
) {
  if (!redirectTo) {
    return `${window.location.origin}${fallback}`;
  }

  if (redirectTo.startsWith("http://") || redirectTo.startsWith("https://")) {
    return redirectTo;
  }

  if (redirectTo.startsWith("/api/")) {
    return redirectTo;
  }

  return `${window.location.origin}${redirectTo}`;
}
