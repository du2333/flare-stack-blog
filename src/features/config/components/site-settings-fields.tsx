import { type FieldPath, useController, useFormContext } from "react-hook-form";
import type { SystemConfig } from "@/features/config/config.schema";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  error,
  readOnly,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  readOnly?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-3">
      <div className="space-y-1 min-h-10 flex flex-col justify-end">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : (
          <div className="h-4" aria-hidden />
        )}
      </div>
      <div className={cn(readOnly && "opacity-70 cursor-default")}>
        {children}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </label>
  );
}

export function RangeField({
  name,
  label,
  hint,
  error,
  min,
  max,
  step,
  unit,
  readOnly,
  defaultValue,
  formatValue,
}: {
  name: FieldPath<SystemConfig>;
  label: string;
  hint?: string;
  error?: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  readOnly?: boolean;
  defaultValue: number;
  formatValue?: (value: number) => string;
}) {
  const { control } = useFormContext<SystemConfig>();
  const { field } = useController({
    control,
    name,
  });

  const currentValue =
    typeof field.value === "number" && !Number.isNaN(field.value)
      ? field.value
      : defaultValue;

  return (
    <label className={cn("space-y-3", readOnly && "opacity-70 cursor-default")}>
      <div className="space-y-1">
        <div className="flex min-h-5 items-end">
          <p className="text-sm font-medium text-foreground">{label}</p>
        </div>
        {hint ? (
          <p className="min-h-10 text-xs leading-5 text-muted-foreground">
            {hint}
          </p>
        ) : (
          <div className="h-10" />
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            {min}
            {unit}
            {" - "}
            {max}
            {unit}
          </div>
          <div className="min-w-18 border border-border/40 bg-muted/20 px-3 py-1 text-right text-xs font-mono text-foreground">
            {formatValue
              ? formatValue(currentValue)
              : `${currentValue}${unit ?? ""}`}
          </div>
        </div>

        <input
          ref={field.ref}
          type="range"
          name={field.name}
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onBlur={field.onBlur}
          onChange={(event) => field.onChange(Number(event.target.value))}
          disabled={readOnly}
          className={cn(
            "h-2 w-full cursor-pointer appearance-none rounded-full bg-muted/50 accent-foreground",
            error && "accent-destructive",
            readOnly && "cursor-default opacity-50",
          )}
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </label>
  );
}
