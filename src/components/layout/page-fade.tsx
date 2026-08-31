import { useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const PAGE_FADE_MS = 200;

export function PageFade({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const pageKey = `${location.pathname}?${JSON.stringify(location.search)}`;
  const [renderedKey, setRenderedKey] = useState(pageKey);
  const [leaving, setLeaving] = useState(false);
  const cacheRef = useRef({ key: pageKey, node: children });
  const latestRef = useRef(children);
  latestRef.current = children;

  const stale = pageKey !== renderedKey || leaving;
  if (!stale) {
    cacheRef.current = { key: pageKey, node: children };
  }

  useEffect(() => {
    if (pageKey === renderedKey) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      cacheRef.current = { key: pageKey, node: latestRef.current };
      setRenderedKey(pageKey);
      document.documentElement.style.setProperty(
        "--fuwari-content-delay",
        "0ms",
      );
      return;
    }

    document.documentElement.style.setProperty("--fuwari-content-delay", "0ms");
    setLeaving(true);
    const t = window.setTimeout(() => {
      cacheRef.current = { key: pageKey, node: latestRef.current };
      setRenderedKey(pageKey);
      setLeaving(false);
    }, PAGE_FADE_MS);
    return () => window.clearTimeout(t);
  }, [pageKey, renderedKey]);

  return (
    <div className={cn("fuwari-page-fade", leaving && "is-leaving")}>
      <div key={stale ? cacheRef.current.key : renderedKey}>
        {stale ? cacheRef.current.node : children}
      </div>
    </div>
  );
}
