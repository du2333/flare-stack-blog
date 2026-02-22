import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { blogConfig } from "@/blog.config";

const { homeImage, globalImage, light, dark, backdropBlur, transitionDuration } =
  blogConfig.theme.default.background;

const hasAnyImage = homeImage !== "" || globalImage !== "";

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
  filter: backdropBlur ? `blur(${backdropBlur}px)` : undefined,
};

export function BackgroundLayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const isHomepage = pathname === "/" || pathname === "";

  // Directly set --scroll-progress CSS variable — no React re-renders on scroll
  useEffect(() => {
    if (!hasAnyImage || !isHomepage) return;

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
  }, [isHomepage]);

  if (!hasAnyImage) return null;

  const transition = `opacity ${transitionDuration}ms ease`;

  // CSS calc() derives opacity from --scroll-progress — no JS recomputation needed
  const homeOpacityExpr = isHomepage
    ? "calc((1 - var(--scroll-progress, 0)) * var(--bg-opacity))"
    : "0";
  const globalOpacityExpr = isHomepage
    ? "calc(var(--scroll-progress, 0) * var(--bg-opacity))"
    : "var(--bg-opacity)";

  return (
    <>
      {/* Preload background images — React 19 hoists <link> to <head> */}
      {homeImage && <link rel="preload" as="image" href={homeImage} />}
      {globalImage && <link rel="preload" as="image" href={globalImage} />}

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
        {/* Home background image */}
        {homeImage && (
          <div
            style={{
              ...imageStyle,
              backgroundImage: `url(${homeImage})`,
              opacity: homeOpacityExpr,
              transition,
            }}
          />
        )}

        {/* Global background image */}
        {globalImage && (
          <div
            style={{
              ...imageStyle,
              backgroundImage: `url(${globalImage})`,
              opacity: globalOpacityExpr,
              transition,
            }}
          />
        )}

        {/* Overlay for text legibility */}
        {(isHomepage || Boolean(globalImage)) && (
          <div
            className="bg-[linear-gradient(to_bottom,transparent,rgba(255,255,255,0.3),rgba(255,255,255,0.8))] dark:bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.3),rgba(0,0,0,0.8))]"
            style={baseStyle}
          />
        )}
      </div>
    </>
  );
}
