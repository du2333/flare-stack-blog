const REDIRECT_URL_ALLOW_LIST: Array<string> = [];

export function normalizeRedirectUrl(
  redirectTo: string | undefined,
  fallback: string,
) {
  // SSR 阶段没有 window：退回相对路径，客户端再规范化
  if (typeof window === "undefined") {
    return fallback;
  }

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
