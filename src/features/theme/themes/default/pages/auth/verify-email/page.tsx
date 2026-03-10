import { Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { VerifyEmailPageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";

export function VerifyEmailPage({ status, error }: VerifyEmailPageProps) {
  return (
    <div className="space-y-12">
      <header className="text-center space-y-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-muted-foreground/60">
          [ {m.verify_email_header()} ]
        </p>
        <h1 className="text-2xl font-serif font-medium tracking-tight">
          {status === "ANALYZING" && m.verify_email_analyzing_title()}
          {status === "SUCCESS" && m.verify_email_success_title()}
          {status === "ERROR" && m.verify_email_error_title()}
        </h1>
      </header>

      <div className="flex flex-col items-center justify-center space-y-8 py-8">
        {status === "ANALYZING" && (
          <div className="flex items-center gap-3 text-muted-foreground/60 animate-in fade-in duration-500">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[10px] font-mono uppercase tracking-widest">
              {m.verify_email_analyzing_desc()}
            </span>
          </div>
        )}

        {status === "SUCCESS" && (
          <div className="text-center space-y-8 animate-in fade-in duration-500">
            <CheckCircle2 className="w-16 h-16 mx-auto text-primary/70 animate-in zoom-in duration-500" />
            <div className="space-y-2">
              <h1 className="text-xl font-serif font-medium tracking-tight">
                {m.verify_email_success_title()}
              </h1>
              <p className="text-sm text-muted-foreground/70 font-light leading-relaxed">
                {m.verify_email_success_desc()}
              </p>
            </div>
            <Link
              to="/"
              className="block w-full py-4 bg-foreground text-background text-[10px] font-mono uppercase tracking-[0.3em] hover:opacity-80 transition-all text-center"
            >
              {m.verify_email_success_action()}
            </Link>
          </div>
        )}

        {status === "ERROR" && (
          <div className="text-center space-y-8 animate-in fade-in duration-500">
            <AlertCircle className="w-16 h-16 mx-auto text-destructive/70 animate-in zoom-in duration-500" />
            <div className="space-y-2">
              <h1 className="text-xl font-serif font-medium tracking-tight">
                {m.verify_email_error_title()}
              </h1>
              <p className="text-sm text-muted-foreground/70 font-light leading-relaxed">
                {error === "invalid_token"
                  ? m.verify_email_error_invalid_token_desc()
                  : m.verify_email_error_generic_desc()}
              </p>
            </div>
            <div className="space-y-4 w-full">
              <Link
                to="/login"
                className="block w-full py-4 border border-border/40 text-[10px] font-mono uppercase tracking-[0.3em] hover:border-foreground transition-all text-center"
              >
                {m.verify_email_error_action()}
              </Link>
              <Link
                to="/login"
                className="block w-full py-4 text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground/60 hover:text-foreground transition-colors text-center"
              >
                [ {m.verify_email_error_resend_action()} ]
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
