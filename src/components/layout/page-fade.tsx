import { useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const PAGE_FADE_MS = 200;

export function PageFade({
  children,
  includeSearch = true,
  onEntered,
  pathKey,
  fill = false,
}: {
  children: React.ReactNode;
  includeSearch?: boolean;
  onEntered?: () => void;
  pathKey?: (pathname: string) => string;
  fill?: boolean;
}) {
  const location = useLocation();
  const pathname = pathKey ? pathKey(location.pathname) : location.pathname;
  const pageKey = includeSearch
    ? `${pathname}?${JSON.stringify(location.search)}`
    : pathname;
  const [renderedKey, setRenderedKey] = useState(pageKey);
  const [leaving, setLeaving] = useState(false);
  const cacheRef = useRef({ key: pageKey, node: children });
  const latestRef = useRef(children);
  const onEnteredRef = useRef(onEntered);
  latestRef.current = children;
  onEnteredRef.current = onEntered;

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
      document.documentElement.style.setProperty("--fuwari-stagger", "0");
      onEnteredRef.current?.();
      return;
    }

    document.documentElement.style.setProperty("--fuwari-content-delay", "0ms");
    document.documentElement.style.setProperty("--fuwari-stagger", "0");
    setLeaving(true);
    const t = window.setTimeout(() => {
      cacheRef.current = { key: pageKey, node: latestRef.current };
      setRenderedKey(pageKey);
      setLeaving(false);
      onEnteredRef.current?.();
    }, PAGE_FADE_MS);
    return () => window.clearTimeout(t);
  }, [pageKey, renderedKey]);

  return (
    <div
      className={cn(
        "fuwari-page-fade",
        leaving && "is-leaving",
        fill && "flex h-full min-h-0 flex-1 flex-col",
      )}
    >
      <div
        key={stale ? cacheRef.current.key : renderedKey}
        className={cn(fill && "flex h-full min-h-0 flex-1 flex-col")}
      >
        {stale ? cacheRef.current.node : children}
      </div>
    </div>
  );
}
