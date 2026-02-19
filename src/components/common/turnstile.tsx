import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { clientEnv } from "@/lib/env/client.env";

const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>,
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    __turnstileToken?: string | null;
  }
}

/**
 * Get the current global Turnstile token for TanStack Server Functions.
 * Used by the client-side middleware to inject X-Turnstile-Token header.
 */
export function getTurnstileToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.__turnstileToken || null;
}

/**
 * Set the global Turnstile token (called internally by useTurnstile).
 */
function setTurnstileToken(token: string | null): void {
  if (typeof window !== "undefined") {
    window.__turnstileToken = token;
  }
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  action?: string;
  widgetIdRef?: RefObject<string | null>;
}

export type { TurnstileProps };

let scriptLoadPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error("Failed to load Turnstile script"));
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

export function Turnstile({
  onVerify,
  onError,
  onExpire,
  action,
  widgetIdRef: externalWidgetIdRef,
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalWidgetIdRef = useRef<string | null>(null);

  const siteKey = clientEnv().VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let mounted = true;

    loadScript()
      .then(() => {
        if (!mounted || !containerRef.current || !window.turnstile) return;

        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: onVerify,
          "error-callback": onError,
          "expired-callback": onExpire,
          action,
          appearance: "interaction-only",
        });
        internalWidgetIdRef.current = id;
        if (externalWidgetIdRef) {
          externalWidgetIdRef.current = id;
        }
      })
      .catch(() => {
        // Turnstile script failed to load — skip silently
      });

    return () => {
      mounted = false;
      if (internalWidgetIdRef.current && window.turnstile) {
        window.turnstile.remove(internalWidgetIdRef.current);
        internalWidgetIdRef.current = null;
        if (externalWidgetIdRef) {
          externalWidgetIdRef.current = null;
        }
      }
    };
  }, [siteKey, onVerify, onError, onExpire, action, externalWidgetIdRef]);

  if (!siteKey) return null;

  return <div ref={containerRef} />;
}

/**
 * Hook for using Turnstile in forms (client-side only).
 * Returns { isPending, token, turnstileProps } — spread turnstileProps onto <Turnstile />.
 * Use `isPending` to disable submit buttons until verification completes.
 * Use `token` in API request headers as `X-Turnstile-Token`.
 */
export function useTurnstile(action?: string) {
  const [token, setToken] = useState<string | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = clientEnv().VITE_TURNSTILE_SITE_KEY;

  const onVerify = useCallback((t: string) => {
    setToken(t);
    setTurnstileToken(t); // Sync to global store for TanStack middleware
  }, []);

  const onExpire = useCallback(() => {
    setToken(null);
    setTurnstileToken(null);
  }, []);

  /** Reset the Turnstile widget to obtain a fresh token (tokens are single-use). */
  const reset = useCallback(() => {
    setToken(null);
    setTurnstileToken(null);
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, []);

  return {
    /** Turnstile is configured but challenge not yet completed */
    isPending: !!siteKey && !token,
    /** The Turnstile token to send in X-Turnstile-Token header */
    token,
    /** Reset the widget to get a fresh token after each API call */
    reset,
    turnstileProps: {
      onVerify,
      onExpire,
      action,
      widgetIdRef,
    } satisfies TurnstileProps,
  };
}
