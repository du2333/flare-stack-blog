import { Link } from "@tanstack/react-router";
import type { RegisterPageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";
import { RegisterForm } from "./form";

export function RegisterPage({
  registerForm,
  turnstileElement,
}: RegisterPageProps) {
  if (registerForm.isSuccess) {
    return (
      <div className="text-center space-y-8 animate-in fade-in duration-500">
        <div className="space-y-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
            [ {m.register_success_label()} ]
          </p>
          <h3 className="text-xl font-serif font-medium tracking-tight">
            {m.register_success_title()}
          </h3>
          <p className="text-sm text-muted-foreground/70 font-light leading-relaxed">
            {m.register_success_desc()}
          </p>
        </div>
        <Link
          to="/login"
          className="block w-full py-4 border border-border/40 text-[10px] font-mono uppercase tracking-[0.3em] hover:border-foreground transition-all text-center"
        >
          {m.register_back_to_login()}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header className="text-center space-y-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-muted-foreground/60">
          [ {m.register_label()} ]
        </p>
        <h1 className="text-2xl font-serif font-medium tracking-tight">
          {m.register_title()}
        </h1>
      </header>

      <div className="space-y-10">
        <RegisterForm form={registerForm} />

        {turnstileElement}

        <div className="text-center pt-4">
          <p className="text-[10px] font-mono text-muted-foreground/50 tracking-wider">
            {m.register_have_account()}{" "}
            <Link
              to="/login"
              className="text-foreground hover:opacity-70 transition-opacity ml-1"
            >
              [ {m.register_go_to_login()} ]
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
