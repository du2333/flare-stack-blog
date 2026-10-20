import { useEffect, useRef } from "react";

/**
 * 纸面光斑：跟随指针的一团柔光（soft-light 混合），像阳光透过纸背。
 * - 只在有精确指针的设备上启用（触屏不显示）
 * - prefers-reduced-motion 下完全不启动
 * - 纯 transform 驱动，不触发重排
 */
export function CursorLight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight * 0.3;
    let x = targetX;
    let y = targetY;
    let raf = 0;

    const onMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      document.body.classList.add("has-pointer");
    };

    const loop = () => {
      x += (targetX - x) * 0.12;
      y += (targetY - y) * 0.12;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
      document.body.classList.remove("has-pointer");
    };
  }, []);

  return <div ref={ref} className="yz-cursor" aria-hidden="true" />;
}
