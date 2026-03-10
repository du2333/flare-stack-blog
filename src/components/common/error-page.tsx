import { useRouter } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";

export function ErrorPage({ error: _error }: { error?: Error }) {
  const router = useRouter();
  const onReset = () => {
    router.invalidate();
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full p-4 md:p-8">
      <div className="w-full max-w-xl flex flex-col items-center text-center space-y-12 animate-in fade-in duration-700">
        <div className="space-y-6">
          <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-muted-foreground/60">
            [ ERROR ]
          </p>
          <h2 className="text-2xl md:text-3xl font-serif font-medium tracking-tight">
            {m.error_title()}
          </h2>
          <p className="text-sm text-muted-foreground/70 font-light leading-relaxed max-w-md mx-auto">
            {m.error_desc()}
          </p>
        </div>

        <button
          onClick={onReset}
          className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition-colors duration-300 gap-2 flex"
        >
          <span>[</span>
          <span>{m.error_retry()}</span>
          <span>]</span>
        </button>
      </div>
    </div>
  );
}
