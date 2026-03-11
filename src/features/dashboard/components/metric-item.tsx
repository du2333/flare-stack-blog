import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export function MetricItem({
  label,
  value,
  prev,
  total,
  format = "number",
  icon,
}: {
  label: string;
  value: number;
  prev?: number;
  total?: number;
  format?: "number" | "percent" | "time";
  icon?: React.ReactNode;
}) {
  const displayValue = useMemo(() => {
    if (format === "percent") {
      const rate = total ? (value / total) * 100 : value;
      return `${rate.toFixed(1)}%`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toString();
  }, [value, total, format]);

  const trend = useMemo(() => {
    if (prev === undefined || prev === 0) return null;
    const diff = value - prev;
    const percent = (diff / prev) * 100;
    return {
      direction: diff > 0 ? "up" : diff < 0 ? "down" : "neutral",
      percent: Math.abs(percent).toFixed(1),
    };
  }, [value, prev]);

  return (
    <div className="border border-border/30 bg-background p-4 flex flex-col justify-between hover:border-border/60 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
          {icon}
          {label}
        </span>
      </div>
      <div>
        <div className="text-xl font-serif font-medium tracking-tight text-foreground">
          {displayValue}
        </div>
        {trend && (
          <div
            className={cn(
              "text-[9px] font-mono flex items-center gap-1 mt-1",
              trend.direction === "up"
                ? "text-emerald-600"
                : trend.direction === "down"
                  ? "text-rose-600"
                  : "text-muted-foreground",
            )}
          >
            {trend.direction === "up" ? (
              <ArrowUp size={8} />
            ) : trend.direction === "down" ? (
              <ArrowDown size={8} />
            ) : (
              <Minus size={8} />
            )}
            <span>{trend.percent}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
