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

  // Use CSS custom property for dynamic opacity calculation
  // The opacity is computed via CSS calc() expressions
  const dynamicOpacityVar = isHomepage
    ? "calc((1 - var(--scroll-progress, 0)) * var(--bg-max-opacity))"
    : "var(--bg-max-opacity)";

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={
        {
          ...baseStyle,
          "--bg-max-opacity-light": light.opacity,
          "--bg-max-opacity-dark": dark.opacity,
          "--scroll-progress": 0,
        } as React.CSSProperties
      }
      className="[--bg-max-opacity:var(--bg-max-opacity-light)] dark:[--bg-max-opacity:var(--bg-max-opacity-dark)]"
    >
      <div
        className="cuckoo-bg-layer"
        style={{
          ...imageStyle,
          backgroundImage: `url(${imageUrl})`,
          transition,
          // @ts-expect-error - CSS custom property for opacity
          "--dynamic-opacity": dynamicOpacityVar,
        }}
      />
    </div>
  );
}
