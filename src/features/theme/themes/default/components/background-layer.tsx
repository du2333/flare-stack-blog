import { useRouterState } from "@tanstack/react-router";
import { useTheme } from "@/components/common/theme-provider";
import { blogConfig } from "@/blog.config";
import { useScrollProgress } from "../hooks/use-scroll-progress";

const { homeImage, globalImage, light, dark, backdropBlur, transitionDuration } =
  blogConfig.background;

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
  const { appTheme } = useTheme();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const scrollProgress = useScrollProgress();

  const hasAnyImage = homeImage !== "" || globalImage !== "";

  if (!hasAnyImage) return null;

  const isHomepage = pathname === "/" || pathname === "";
  const themeOpacity = appTheme === "dark" ? dark.opacity : light.opacity;
  const transition = `opacity ${transitionDuration}ms ease`;

  const homeOpacity = isHomepage ? (1 - scrollProgress) * themeOpacity : 0;
  const globalOpacity = isHomepage
    ? scrollProgress * themeOpacity
    : themeOpacity;

  const showOverlay = hasAnyImage && themeOpacity > 0;

  const overlayGradient =
    appTheme === "dark"
      ? "linear-gradient(to bottom, transparent, rgba(0,0,0,0.3), rgba(0,0,0,0.8))"
      : "linear-gradient(to bottom, transparent, rgba(255,255,255,0.3), rgba(255,255,255,0.8))";

  return (
    <div aria-hidden="true">
      {/* Home background image */}
      <div
        style={{
          ...imageStyle,
          backgroundImage: homeImage ? `url(${homeImage})` : undefined,
          opacity: homeOpacity,
          transition,
        }}
      />

      {/* Global background image */}
      <div
        style={{
          ...imageStyle,
          backgroundImage: globalImage ? `url(${globalImage})` : undefined,
          opacity: globalOpacity,
          transition,
        }}
      />

      {/* Overlay for text legibility */}
      {showOverlay && (
        <div
          style={{
            ...baseStyle,
            background: overlayGradient,
            backdropFilter: `blur(${backdropBlur}px)`,
          }}
        />
      )}
    </div>
  );
}
