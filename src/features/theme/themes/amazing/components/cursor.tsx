import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Magnetic Liquid Cursor — Amazing Theme
 *
 * Two-layer custom cursor:
 *  - Outer ring: follows mouse with lerp delay, mix-blend-mode: difference
 *  - Inner dot: tracks mouse precisely
 *
 * On hovering interactive elements: outer ring scales up 2x for magnetic effect.
 * Hidden on mobile / touch devices automatically via CSS.
 */
export function Cursor() {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const target = useRef({ x: -100, y: -100 });
  const rafId = useRef<number>(0);
  const [isDesktop, setIsDesktop] = useState(false);

  const lerp = useCallback(
    (a: number, b: number, t: number) => a + (b - a) * t,
    [],
  );

  useEffect(() => {
    // Only show on devices with fine pointer (no touch)
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setIsDesktop(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;

    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    // Activate custom cursor class on body
    document.body.classList.add("amazing-custom-cursor-active");

    const handleMouseMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;

      // Inner dot follows immediately
      inner.style.transform = `translate(${e.clientX - 3}px, ${e.clientY - 3}px)`;
    };

    const handleMouseEnterInteractive = () => {
      outer.classList.add("is-hovering");
      inner.classList.add("is-hovering");
    };
    const handleMouseLeaveInteractive = () => {
      outer.classList.remove("is-hovering");
      inner.classList.remove("is-hovering");
    };
    const handleMouseDown = () => outer.classList.add("is-clicking");
    const handleMouseUp = () => outer.classList.remove("is-clicking");

    // Lerp animation loop for outer ring
    const tick = () => {
      pos.current.x = lerp(pos.current.x, target.current.x, 0.15);
      pos.current.y = lerp(pos.current.y, target.current.y, 0.15);

      const outerSize = outer.offsetWidth;
      outer.style.transform = `translate(${pos.current.x - outerSize / 2}px, ${pos.current.y - outerSize / 2}px)`;

      rafId.current = requestAnimationFrame(tick);
    };

    // Attach interactive element listeners
    const interactiveSelector =
      'a, button, [role="button"], input, textarea, select, label[for], .amazing-cursor-hover';
    const attachInteractiveListeners = () => {
      document
        .querySelectorAll<HTMLElement>(interactiveSelector)
        .forEach((el) => {
          el.addEventListener("mouseenter", handleMouseEnterInteractive);
          el.addEventListener("mouseleave", handleMouseLeaveInteractive);
        });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    attachInteractiveListeners();

    // Re-attach on DOM changes (route transitions, etc.)
    const observer = new MutationObserver(() => {
      attachInteractiveListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    rafId.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      observer.disconnect();
      document.body.classList.remove("amazing-custom-cursor-active");

      document
        .querySelectorAll<HTMLElement>(interactiveSelector)
        .forEach((el) => {
          el.removeEventListener("mouseenter", handleMouseEnterInteractive);
          el.removeEventListener("mouseleave", handleMouseLeaveInteractive);
        });
    };
  }, [isDesktop, lerp]);

  if (!isDesktop) return null;

  return (
    <>
      <div ref={outerRef} className="amazing-cursor-outer" />
      <div ref={innerRef} className="amazing-cursor-inner" />
    </>
  );
}
