import { Toaster as Sonner } from "sonner";
import { buttonClass } from "@/components/ui/button";

export function Toaster() {
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
            "group w-full max-w-[350px] flex items-center justify-between gap-4 p-5 bg-(--theme-raised) rounded-(--fuwari-radius-large) shadow-lg transition-all duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-10 data-[state=open]:slide-in-from-bottom-4",
          icon: "relative flex size-4 shrink-0 items-center justify-center",
          title: "text-sm font-medium fuwari-text-90 tracking-tight",
          description: "text-xs fuwari-text-50 mt-1",
          content: "flex flex-col gap-0.5 flex-1 min-w-0 pr-2",
          actionButton: buttonClass({ variant: "primary", size: "sm" }),
          cancelButton: buttonClass({ size: "sm" }),
        },
      }}
    />
  );
}
