import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { backgroundConfigQuery } from "@/features/config/queries";
import { DEFAULT_BACKGROUND_CONFIG } from "@/features/config/config.schema";

export function Background() {
  const { data: config } = useQuery(backgroundConfigQuery);

  const enabled = config?.enabled ?? DEFAULT_BACKGROUND_CONFIG.enabled;
  const globalUrl = config?.imageUrl ?? DEFAULT_BACKGROUND_CONFIG.imageUrl;
  const homeUrl = config?.homeImageUrl ?? DEFAULT_BACKGROUND_CONFIG.homeImageUrl;
  const opacity = config?.opacity ?? DEFAULT_BACKGROUND_CONFIG.opacity!;
  const darkOpacity = config?.darkOpacity ?? DEFAULT_BACKGROUND_CONFIG.darkOpacity!;
  const blur = config?.blur ?? DEFAULT_BACKGROUND_CONFIG.blur!;
  const overlayOpacity =
    config?.overlayOpacity ?? DEFAULT_BACKGROUND_CONFIG.overlayOpacity!;

  // Detect if we're on the homepage
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHomepage = pathname === "/";

  // Scroll-based crossfade ratio (0 = full home image, 1 = full global image)
  const [scrollRatio, setScrollRatio] = useState(0);

  const handleScroll = useCallback(() => {
    const vh = window.innerHeight;
    const ratio = Math.min(window.scrollY / vh, 1);
    setScrollRatio(ratio);
  }, []);

  useEffect(() => {
    if (!isHomepage || !homeUrl) return;

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Set initial value
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomepage, homeUrl, handleScroll]);

  if (!enabled || (!globalUrl && !homeUrl)) return null;

  // Determine which image(s) to show
  const showHomeLayer = isHomepage && !!homeUrl;
  const showGlobalLayer = !!globalUrl;

  // When not on homepage or no home image, show global at full strength
  const homeOpacity = showHomeLayer ? 1 - scrollRatio : 0;
  const globalOpacity = showHomeLayer
    ? (showGlobalLayer ? scrollRatio : 0)
    : 1;

  return (
    <div className="fixed inset-0 -z-50 h-full w-full overflow-hidden">
      {/* Home image layer (homepage only) */}
      {showHomeLayer && (
        <>
          {/* Light mode */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-none dark:hidden"
            style={{
              backgroundImage: `url('${homeUrl}')`,
              opacity: homeOpacity * (opacity / 100),
            }}
          />
          {/* Dark mode */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-none hidden dark:block"
            style={{
              backgroundImage: `url('${homeUrl}')`,
              opacity: homeOpacity * (darkOpacity / 100),
            }}
          />
        </>
      )}

      {/* Global image layer */}
      {showGlobalLayer && (
        <>
          {/* Light mode */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-none dark:hidden"
            style={{
              backgroundImage: `url('${globalUrl}')`,
              opacity: globalOpacity * (opacity / 100),
            }}
          />
          {/* Dark mode */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-none hidden dark:block"
            style={{
              backgroundImage: `url('${globalUrl}')`,
              opacity: globalOpacity * (darkOpacity / 100),
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
