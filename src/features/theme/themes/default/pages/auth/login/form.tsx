import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { LoginFormData } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";

interface LoginFormProps {
  form: LoginFormData;
  isEmailConfigured: boolean;
}

export function LoginForm({ form, isEmailConfigured }: LoginFormProps) {
  const {
    register,
    errors,
    handleSubmit,
    loginStep,
    isSubmitting,
    turnstilePending,
  } = form;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-6">
        <div className="space-y-2 group">
          <label
            htmlFor="login-email"
            className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 group-focus-within:text-foreground transition-colors"
          >
            {m.login_email_address()}
          </label>
          <Input
            id="login-email"
            type="email"
            {...register("email")}
            className="w-full bg-transparent border-0 border-b border-border/40 rounded-none py-3 text-sm font-light focus-visible:ring-0 focus:border-foreground focus:outline-none transition-all placeholder:text-muted-foreground/30 shadow-none px-0"
            placeholder={m.login_email_placeholder()}
            autoComplete="username"
            disabled={isSubmitting || loginStep !== "IDLE"}
          />
          {errors.email && (
            <span className="text-[9px] font-mono text-destructive uppercase tracking-widest mt-1 block">
              {errors.email.message}
            </span>
          )}
        </div>

        <div className="space-y-2 group">
          <div className="flex justify-between items-center">
            <label
              htmlFor="login-password"
              className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 group-focus-within:text-foreground transition-colors"
            >
              {m.login_password()}
            </label>
            {isEmailConfigured && (
              <Link
                to="/forgot-password"
                tabIndex={-1}
                className="text-[9px] font-mono text-muted-foreground/40 hover:text-foreground transition-colors"
              >
                [ {m.login_forgot_password()} ]
              </Link>
            )}
          </div>
          <Input
            id="login-password"
            type="password"
            {...register("password")}
            className="w-full bg-transparent border-0 border-b border-border/40 rounded-none py-3 text-sm font-light focus-visible:ring-0 focus:border-foreground focus:outline-none transition-all placeholder:text-muted-foreground/30 shadow-none px-0"
            placeholder={m.login_password_placeholder()}
            autoComplete="current-password"
            disabled={isSubmitting || loginStep !== "IDLE"}
          />
          {errors.password && (
            <span className="text-[9px] font-mono text-destructive uppercase tracking-widest mt-1 block">
              {errors.password.message}
            </span>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || loginStep !== "IDLE" || turnstilePending}
        className="w-full py-4 bg-foreground text-background text-[10px] font-mono uppercase tracking-[0.3em] hover:opacity-80 transition-all disabled:opacity-30 flex items-center justify-center gap-3"
      >
        {loginStep === "VERIFYING" ? (
          <Loader2 className="animate-spin" size={14} />
        ) : (
          <span>{m.login_submit()}</span>
        )}
      </button>
    </form>
  );
}
