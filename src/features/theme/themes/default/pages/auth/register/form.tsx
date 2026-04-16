import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { RegisterFormData } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";

interface RegisterFormProps {
  form: RegisterFormData;
}

export function RegisterForm({ form }: RegisterFormProps) {
  const { register, errors, handleSubmit, isSubmitting, turnstilePending } =
    form;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-6">
        <div className="space-y-2 group">
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 group-focus-within:text-foreground transition-colors">
            {m.register_nickname()}
          </label>
          <Input
            type="text"
            {...register("name")}
            className="w-full bg-transparent border-0 border-b border-border/40 rounded-none py-3 text-sm font-light focus-visible:ring-0 focus:border-foreground focus:outline-none transition-all placeholder:text-muted-foreground/30 shadow-none px-0"
            placeholder={m.register_nickname_placeholder()}
          />
          {errors.name && (
            <span className="text-[9px] font-mono text-destructive uppercase tracking-widest mt-1 block">
              {errors.name.message}
            </span>
          )}
        </div>

        <div className="space-y-2 group">
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 group-focus-within:text-foreground transition-colors">
            {m.login_email_address()}
          </label>
          <Input
            type="email"
            {...register("email")}
            className="w-full bg-transparent border-0 border-b border-border/40 rounded-none py-3 text-sm font-light focus-visible:ring-0 focus:border-foreground focus:outline-none transition-all placeholder:text-muted-foreground/30 shadow-none px-0"
            placeholder={m.login_email_placeholder()}
          />
          {errors.email && (
            <span className="text-[9px] font-mono text-destructive uppercase tracking-widest mt-1 block">
              {errors.email.message}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 group">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 group-focus-within:text-foreground transition-colors">
              {m.register_password()}
            </label>
            <Input
              type="password"
              {...register("password")}
              className="w-full bg-transparent border-0 border-b border-border/40 rounded-none py-3 text-sm font-light focus-visible:ring-0 focus:border-foreground focus:outline-none transition-all placeholder:text-muted-foreground/30 shadow-none px-0"
              placeholder={m.login_password_placeholder()}
            />
            {errors.password && (
              <span className="text-[9px] font-mono text-destructive uppercase tracking-widest mt-1 block">
                {errors.password.message}
              </span>
            )}
          </div>
          <div className="space-y-2 group">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 group-focus-within:text-foreground transition-colors">
              {m.register_confirm_password()}
            </label>
            <Input
              type="password"
              {...register("confirmPassword")}
              className="w-full bg-transparent border-0 border-b border-border/40 rounded-none py-3 text-sm font-light focus-visible:ring-0 focus:border-foreground focus:outline-none transition-all placeholder:text-muted-foreground/30 shadow-none px-0"
              placeholder={m.login_password_placeholder()}
            />
            {errors.confirmPassword && (
              <span className="text-[9px] font-mono text-destructive uppercase tracking-widest mt-1 block">
                {errors.confirmPassword.message}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || turnstilePending}
        className="w-full py-4 bg-foreground text-background text-[10px] font-mono uppercase tracking-[0.3em] hover:opacity-80 transition-all disabled:opacity-30 flex items-center justify-center gap-3"
      >
        {isSubmitting ? (
          <Loader2 className="animate-spin" size={14} />
        ) : (
          <span>{m.register_submit()}</span>
        )}
      </button>
    </form>
  );
}
