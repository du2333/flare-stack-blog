import { useCallback, useEffect, useRef, useState } from "react";
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
  }
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  action?: string;
}

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
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const siteKey = clientEnv().VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let mounted = true;

    loadScript()
      .then(() => {
        if (!mounted || !containerRef.current || !window.turnstile) return;

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: onVerify,
          "error-callback": onError,
          "expired-callback": onExpire,
          action,
          appearance: "interaction-only",
        });
      })
      .catch(() => {
        // Turnstile script failed to load — skip silently
      });

    return () => {
      mounted = false;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onVerify, onError, onExpire, action]);

  if (!siteKey) return null;

  return <div ref={containerRef} />;
}

/**
 * Hook for using Turnstile in forms (client-side only).
 * Returns { isPending, turnstileProps } — spread turnstileProps onto <Turnstile />.
 * Use `isPending` to disable submit buttons until verification completes.
 */
export function useTurnstile(action?: string) {
  const [verified, setVerified] = useState(false);
  const siteKey = clientEnv().VITE_TURNSTILE_SITE_KEY;

  const onVerify = useCallback(() => setVerified(true), []);
  const onExpire = useCallback(() => setVerified(false), []);

  return {
    /** Turnstile is configured but challenge not yet completed */
    isPending: !!siteKey && !verified,
    turnstileProps: { onVerify, onExpire, action } satisfies TurnstileProps,
  };
}
