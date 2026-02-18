import { useCallback, useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { blogConfig } from "@/blog.config";

export function Background() {
  const {
    imageUrl: globalUrl,
    homeImageUrl: homeUrl,
    opacity,
    darkOpacity,
    blur,
    overlayOpacity,
    transitionDuration,
  } = blogConfig.background;

  // Detect if we're on the homepage
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHomepage = pathname === "/" || pathname === "";

  // Scroll-based crossfade ratio (0 = full home image, 1 = full global image)
  const [scrollRatio, setScrollRatio] = useState(0);

  // --- Route transition flag ---
  // Only controls whether CSS transition is active; layers stay always mounted.
  const prevIsHomepageRef = useRef(isHomepage);
  const [routeTransitioning, setRouteTransitioning] = useState(false);

  useEffect(() => {
    const wasHomepage = prevIsHomepageRef.current;
    prevIsHomepageRef.current = isHomepage;

    if (wasHomepage === isHomepage) return;

    // Reset scroll ratio when arriving at homepage
    if (isHomepage) {
      setScrollRatio(0);
    }

    // Enable CSS transition for the duration of the crossfade.
    setRouteTransitioning(true);
    const timer = setTimeout(() => setRouteTransitioning(false), transitionDuration);

    return () => clearTimeout(timer);
  }, [isHomepage, transitionDuration]);

  const handleScroll = useCallback(() => {
    const vh = window.innerHeight;
    const ratio = Math.min(window.scrollY / vh, 1);
    setScrollRatio(ratio);
  }, []);

  useEffect(() => {
    if (!isHomepage || !homeUrl) return;

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomepage, homeUrl, handleScroll]);

  if (!globalUrl && !homeUrl) return null;

  // Opacity derived directly from current state
  const homeLayerOpacity = isHomepage ? 1 - scrollRatio : 0;
  const globalLayerOpacity = isHomepage ? (globalUrl ? scrollRatio : 0) : 1;

  // Only apply CSS transition during route changes, not during scroll
  const transitionStyle = routeTransitioning
    ? `opacity ${transitionDuration}ms ease`
    : "none";

  return (
    <div className="fixed inset-0 -z-50 h-full w-full overflow-hidden">
      {/* Home image layer — always mounted so CSS transition works across routes */}
      {!!homeUrl && (
        <>
          {/* Light mode */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat dark:hidden"
            style={{
              backgroundImage: `url('${homeUrl}')`,
              opacity: homeLayerOpacity * (opacity / 100),
              transition: transitionStyle,
            }}
          />
          {/* Dark mode */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat hidden dark:block"
            style={{
              backgroundImage: `url('${homeUrl}')`,
              opacity: homeLayerOpacity * (darkOpacity / 100),
              transition: transitionStyle,
            }}
          />
        </>
      )}

      {/* Global image layer */}
      {!!globalUrl && (
        <>
          {/* Light mode */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat dark:hidden"
            style={{
              backgroundImage: `url('${globalUrl}')`,
              opacity: globalLayerOpacity * (opacity / 100),
              transition: transitionStyle,
            }}
          />
          {/* Dark mode */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat hidden dark:block"
            style={{
              backgroundImage: `url('${globalUrl}')`,
              opacity: globalLayerOpacity * (darkOpacity / 100),
              transition: transitionStyle,
            }}
          />
        </>
      )}

      {/* Gradient overlay for edge blending */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to top, hsl(var(--background) / ${overlayOpacity * 0.9 / 100}), hsl(var(--background) / ${overlayOpacity * 0.5 / 100}), hsl(var(--background) / ${overlayOpacity * 0.9 / 100}))`,
        }}
      />

      {/* Blur + base color overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: `hsl(var(--background) / ${overlayOpacity / 100})`,
          backdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
        }}
      />
    </div>
  );
}
