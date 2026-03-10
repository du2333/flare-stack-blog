import { useNavigate } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";

export function NotFound() {
  const navigate = useNavigate();
  const onReturn = () => {
    navigate({ to: "/" });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full p-6 text-center bg-background">
      <div className="space-y-12 animate-in fade-in duration-700">
        <div className="space-y-6">
          <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-muted-foreground/60">
            [ 404 ]
          </p>
          <h2 className="text-2xl md:text-3xl font-serif font-medium tracking-tight text-foreground">
            {m.not_found_title()}
          </h2>
          <p className="max-w-md mx-auto text-sm text-muted-foreground/70 font-light leading-relaxed">
            {m.not_found_desc()}
          </p>
        </div>

        <button
          onClick={onReturn}
          className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition-colors duration-300"
        >
          <span>[</span>
          <span>{m.not_found_return()}</span>
          <span>]</span>
        </button>
      </div>
    </div>
  );
}
