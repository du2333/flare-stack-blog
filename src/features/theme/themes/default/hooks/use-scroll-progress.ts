import { useEffect, useState } from "react";

/**
 * Returns a value between 0 and 1 representing how far the user has scrolled
 * through the first viewport height (0 = top, 1 = scrolled past 100vh).
 * Returns 0 on the server.
 */
export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      setProgress(Math.min(scrollY / viewportHeight, 1));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return progress;
}
