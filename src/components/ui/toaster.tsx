import { Toaster as Sonner } from "sonner";
import type React from "react";
import type { ToasterProps } from "sonner";

const Toaster: React.FC<ToasterProps> = (props) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-right"
      visibleToasts={3}
      duration={4000}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "group w-full max-w-[350px] flex items-center justify-between gap-4 p-5 bg-background border border-border/40 shadow-sm transition-all duration-500 hover:border-border/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-10 data-[state=open]:slide-in-from-bottom-4",
          title: "text-sm font-medium text-foreground tracking-tight",
          description: "text-xs text-muted-foreground mt-1",
          content: "flex flex-col gap-0.5 flex-1 min-w-0 pr-2",
          actionButton:
            "shrink-0 bg-foreground text-background text-xs font-medium px-4 py-2 hover:opacity-90 transition-opacity rounded-none",
          cancelButton:
            "shrink-0 border border-border bg-transparent text-muted-foreground text-xs font-medium px-4 py-2 hover:bg-muted transition-colors rounded-none",
        },
      }}
      {...props}
    />
  );
};

export default Toaster;
