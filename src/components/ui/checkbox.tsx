import { Check } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    onCheckedChange?: (checked: boolean) => void;
  }
>(({ className, checked, onCheckedChange, onChange, ...props }, ref) => (
  <div className="relative flex items-center">
    <input
      type="checkbox"
      className="peer absolute h-4 w-4 opacity-0 cursor-pointer z-10"
      ref={ref}
      checked={checked}
      onChange={(e) => {
        onChange?.(e);
        onCheckedChange?.(e.target.checked);
      }}
      {...props}
    />
    <div
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center border border-border/50 transition-colors",
        checked
          ? "bg-foreground border-foreground text-background"
          : "bg-transparent",
        className,
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={2} />}
    </div>
  </div>
));
Checkbox.displayName = "Checkbox";

export { Checkbox };
