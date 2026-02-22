import * as React from "react";
import { cn } from "@/lib/utils";

const TooltipProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const TooltipContext = React.createContext<{
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
} | null>(null);

const Tooltip = ({ children }: { children: React.ReactNode }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement>(null);

  return (
    <TooltipContext.Provider value={{ isVisible, setIsVisible, anchorRef }}>
      <div
        ref={anchorRef}
        className="relative inline-block"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children}
      </div>
    </TooltipContext.Provider>
  );
};

const TooltipTrigger = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { asChild?: boolean }
>(({ className, children, asChild, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement & {
      props: { className?: string };
    };
    return React.cloneElement(child, {
      ...props,
      className: cn(className, child.props.className),
      ref,
    } as React.HTMLAttributes<HTMLElement>);
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      className={cn(className)}
      {...props}
    >
      {children}
    </button>
  );
});
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    side?: "top" | "bottom" | "auto";
    sideOffset?: number;
  }
>(({ className, side = "auto", sideOffset = 8, ...props }, ref) => {
  const context = React.useContext(TooltipContext);
  const [computedSide, setComputedSide] = React.useState<"top" | "bottom">(
    "bottom",
  );
  const internalRef = React.useRef<HTMLDivElement>(null);

  if (!context) throw new Error("TooltipContent must be used within Tooltip");

  React.useLayoutEffect(() => {
    if (
      !context.isVisible ||
      !context.anchorRef.current ||
      !internalRef.current
    )
      return;

    if (side !== "auto") {
      setComputedSide(side);
      return;
    }

    const anchorRect = context.anchorRef.current.getBoundingClientRect();
    const contentHeight = internalRef.current.offsetHeight;
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - anchorRect.bottom;
    const spaceAbove = anchorRect.top;

    // Logic: Flip if bottom space is not enough AND top has more space
    if (spaceBelow < contentHeight + sideOffset && spaceAbove > spaceBelow) {
      setComputedSide("top");
    } else {
      setComputedSide("bottom");
    }
  }, [context.isVisible, side, sideOffset]);

  if (!context.isVisible) return null;

  return (
    <div
      ref={(node) => {
        // Handle both the forwarded ref and the internal ref
        if (typeof ref === "function") ref(node);
        else if (ref)
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        internalRef.current = node;
      }}
      className={cn(
        "absolute z-50 overflow-hidden border border-border/30 bg-popover px-2 py-1 text-[9px] font-mono uppercase tracking-widest text-popover-foreground shadow-xl animate-in fade-in zoom-in-95 duration-200",
        computedSide === "bottom" ? "top-full" : "bottom-full",
        "left-1/2 -translate-x-1/2",
        className,
      )}
      style={{
        marginTop: computedSide === "bottom" ? `${sideOffset}px` : undefined,
        marginBottom: computedSide === "top" ? `${sideOffset}px` : undefined,
      }}
      {...props}
    />
  );
});
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
