import { Toaster as Sonner } from "sonner";

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
            "group w-full max-w-[350px] flex items-center justify-between gap-4 p-5 bg-(--cuckoo-card-bg) rounded-(--cuckoo-radius) shadow-lg transition-all duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-10 data-[state=open]:slide-in-from-bottom-4",
          title: "text-sm font-medium cuckoo-text-90 tracking-tight",
          description: "text-xs cuckoo-text-50 mt-1",
          content: "flex flex-col gap-0.5 flex-1 min-w-0 pr-2",
          actionButton:
            "shrink-0 cuckoo-btn-primary text-xs font-medium px-4 py-2 rounded-(--cuckoo-radius)",
          cancelButton:
            "shrink-0 cuckoo-btn-regular text-xs font-medium px-4 py-2 rounded-(--cuckoo-radius)",
        },
      }}
    />
  );
}
