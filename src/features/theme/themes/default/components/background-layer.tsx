import { useRouterState } from "@tanstack/react-router";
import { blogConfig } from "@/blog.config";
import { useScrollProgress } from "../hooks/use-scroll-progress";

const { homeImage, globalImage, light, dark, backdropBlur, transitionDuration } =
  blogConfig.theme.default.background;

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
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const scrollProgress = useScrollProgress();

  const hasAnyImage = homeImage !== "" || globalImage !== "";

  if (!hasAnyImage) return null;

  const isHomepage = pathname === "/" || pathname === "";
  const transition = `opacity ${transitionDuration}ms ease`;

  // Normalized opacity (0-1) based on scroll/route only — theme opacity applied via CSS var
  const homeOpacity = isHomepage ? 1 - scrollProgress : 0;
  const globalOpacity = isHomepage ? scrollProgress : 1;

  return (
    <div
      aria-hidden="true"
      className="[--bg-opacity:var(--bg-opacity-light)] dark:[--bg-opacity:var(--bg-opacity-dark)]"
      style={{
        "--bg-opacity-light": light.opacity,
        "--bg-opacity-dark": dark.opacity,
      } as React.CSSProperties}
    >
      {/* Home background image */}
      {homeImage && (
        <div
          style={{
            ...imageStyle,
            backgroundImage: `url(${homeImage})`,
            opacity: `calc(${homeOpacity} * var(--bg-opacity))`,
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
            opacity: `calc(${globalOpacity} * var(--bg-opacity))`,
            transition,
          }}
        />
      )}

      {/* Overlay for text legibility */}
      <div
        className="bg-[linear-gradient(to_bottom,transparent,rgba(255,255,255,0.3),rgba(255,255,255,0.8))] dark:bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.3),rgba(0,0,0,0.8))]"
        style={{
          ...baseStyle,
          backdropFilter: backdropBlur ? `blur(${backdropBlur}px)` : undefined,
        }}
      />
    </div>
  );
}
