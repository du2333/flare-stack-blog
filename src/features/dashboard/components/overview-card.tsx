import { Moon, Sun, Sunrise, Sunset } from "lucide-react";
import { type ReactNode, type Ref, useEffect, useState } from "react";
import { riseOrder } from "@/components/admin/rise";
import { formatCount } from "./format";

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - (1 - t) ** 4)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

/** A number that counts up to its value as the card rises in. */
export function Count({ value }: { value: number }) {
  return <>{formatCount(useCountUp(value))}</>;
}

/** One of the overview's cards: a title row, then the body. */
export function OverviewCard({
  title,
  titleRef,
  count,
  sub,
  link,
  i,
  children,
}: {
  title: string;
  /** Takes focus when the focused row of the card leaves it. */
  titleRef?: Ref<HTMLHeadingElement>;
  count?: number;
  sub?: string;
  link?: ReactNode;
  /** The card's place in the rise-in. */
  i: number;
  children: ReactNode;
}) {
  return (
    <section className="overview-card admin-rise" style={riseOrder(i)}>
      <header className="overview-card-head">
        <h2
          ref={titleRef}
          tabIndex={titleRef ? -1 : undefined}
          className="overview-card-title"
        >
          {title}
        </h2>
        {count ? <span className="overview-count">{count}</span> : null}
        {sub ? <span className="overview-card-sub">{sub}</span> : null}
        {link}
      </header>
      {children}
    </section>
  );
}

/** The time of day beside the date: night, sunrise, day, sunset. */
export function TimeIcon({ hour }: { hour: number }) {
  const Icon =
    hour < 5
      ? Moon
      : hour < 9
        ? Sunrise
        : hour < 17
          ? Sun
          : hour < 20
            ? Sunset
            : Moon;
  return <Icon size={14} aria-hidden />;
}
