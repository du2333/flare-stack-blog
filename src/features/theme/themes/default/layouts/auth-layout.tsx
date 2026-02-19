import type { AuthLayoutProps } from "@/features/theme/contract/layouts";

export function AuthLayout({ onBack, children }: AuthLayoutProps) {
  return (
    <div className="default-theme min-h-screen w-full flex flex-col">
      <header className="h-16 flex items-center px-6 md:px-12">
        <button
          onClick={onBack}
          type="button"
          className="text-[10px] font-mono text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          [ ← 返回 ]
        </button>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center p-6 md:p-12">
        <div className="w-full max-w-sm animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      <footer className="h-16" />
    </div>
  );
}
