import { Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { VerifyEmailPageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";

export function VerifyEmailPage({ status, error }: VerifyEmailPageProps) {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold fuwari-text-90">
          {status === "ANALYZING" && m.verify_email_analyzing_title()}
          {status === "SUCCESS" && m.verify_email_success_title()}
          {status === "ERROR" && m.verify_email_error_title()}
        </h1>
      </div>

      <div className="flex flex-col items-center justify-center p-4">
        {status === "ANALYZING" && (
          <div className="flex items-center gap-3 text-(--fuwari-primary) animate-in fade-in duration-500 py-8">
            <Loader2 size={32} strokeWidth={1.5} className="animate-spin" />
            <span className="text-sm font-bold tracking-widest">
              {m.verify_email_analyzing()}
            </span>
          </div>
        )}

        {status === "SUCCESS" && (
          <div className="flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-500 w-full py-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mb-2">
              <CheckCircle2 size={32} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium fuwari-text-50 leading-relaxed max-w-xs mx-auto">
              {m.verify_email_success_desc()}
            </p>
            <Link
              to="/"
              className="w-full py-3.5 rounded-xl fuwari-btn-primary font-bold text-sm transition-all active:scale-[0.98] mt-4"
            >
              {m.verify_email_success_action()}
            </Link>
          </div>
        )}

        {status === "ERROR" && (
          <div className="flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-500 w-full py-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-2">
              <AlertCircle size={32} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium fuwari-text-50 leading-relaxed max-w-xs mx-auto text-red-600 dark:text-red-400">
              {error === "invalid_token"
                ? m.verify_email_error_invalid_token_desc()
                : m.verify_email_error_generic_desc()}
            </p>
            <div className="space-y-4 w-full flex flex-col pt-4">
              <Link
                to="/login"
                className="w-full py-3.5 rounded-xl fuwari-btn-primary font-bold text-sm transition-all active:scale-[0.98]"
              >
                {m.verify_email_error_action()}
              </Link>
              <Link
                to="/login"
                className="text-xs font-medium text-(--fuwari-primary) hover:underline"
              >
                {m.verify_email_error_resend_action()}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
