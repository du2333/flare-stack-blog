import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { blogConfig } from "@/blog.config";

const { enabled, apiUrl, light, dark, transitionDuration } =
  blogConfig.theme.cuckoo.background;

const baseStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  zIndex: 0,
};

const imageStyle: React.CSSProperties = {
  ...baseStyle,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

export function BackgroundLayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const imageUrl = enabled ? apiUrl : "";

  useEffect(() => {
    if (!imageUrl) return;

    const handleScroll = () => {
      const progress = Math.min(window.scrollY / window.innerHeight, 1);
      containerRef.current?.style.setProperty(
        "--scroll-progress",
        String(progress),
      );
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [imageUrl]);

  if (!imageUrl) return null;

  const transition = `opacity ${transitionDuration}ms ease`;

  const isHomepage = pathname === "/" || pathname === "";
  const homeOpacityExpr = isHomepage
    ? "calc((1 - var(--scroll-progress, 0)) * var(--bg-opacity))"
    : "0";
  const globalOpacityExpr = isHomepage
    ? "calc(var(--scroll-progress, 0) * var(--bg-opacity))"
    : "var(--bg-opacity)";

  return (
    <>
      {imageUrl && <link rel="preload" as="image" href={imageUrl} />}

      <div
        ref={containerRef}
        aria-hidden="true"
        className="[--bg-opacity:var(--bg-opacity-light)] dark:[--bg-opacity:var(--bg-opacity-dark)]"
        style={
          {
            "--bg-opacity-light": light.opacity,
            "--bg-opacity-dark": dark.opacity,
            "--scroll-progress": "0",
          } as React.CSSProperties
        }
      >
        <div
          style={{
            ...imageStyle,
            backgroundImage: `url(${imageUrl})`,
            opacity: isHomepage ? homeOpacityExpr : globalOpacityExpr,
            transition,
          }}
        />
      </div>
    </>
  );
}
