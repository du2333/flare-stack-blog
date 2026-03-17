const REDIRECT_URL_ALLOW_LIST: Array<string> = [];

export function normalizeRedirectUrl(
  redirectTo: string | undefined,
  fallback: string,
) {
  const safeFallback = `${window.location.origin}${fallback}`;

  if (!redirectTo) {
    return safeFallback;
  }

  try {
    const normalizedUrl = new URL(redirectTo, window.location.origin);
    const isSameOrigin = normalizedUrl.origin === window.location.origin;
    const isAllowedExternalHostname = REDIRECT_URL_ALLOW_LIST.includes(
      normalizedUrl.hostname,
    );

    if (!isSameOrigin && !isAllowedExternalHostname) {
      return safeFallback;
    }

    if (normalizedUrl.pathname.startsWith("/api/")) {
      return `${normalizedUrl.pathname}${normalizedUrl.search}${normalizedUrl.hash}`;
    }

    return normalizedUrl.toString();
  } catch {
    return safeFallback;
  }
}
