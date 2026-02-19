import { Link } from "@tanstack/react-router";
import { RegisterForm } from "./form";
import type { RegisterPageProps } from "@/features/theme/contract/pages";

export function RegisterPage({
  registerForm,
  turnstileElement,
}: RegisterPageProps) {
  if (registerForm.isSuccess) {
    return (
      <div className="text-center space-y-8 animate-in fade-in duration-500">
        <div className="space-y-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
            [ EMAIL_SENT ]
          </p>
          <h3 className="text-xl font-serif font-medium tracking-tight">
            验证您的邮箱
          </h3>
          <p className="text-sm text-muted-foreground/70 font-light leading-relaxed">
            一封验证邮件已发送至您的邮箱。请点击邮件中的链接以激活账户。
          </p>
        </div>
        <Link
          to="/login"
          className="block w-full py-4 border border-border/40 text-[10px] font-mono uppercase tracking-[0.3em] hover:border-foreground transition-all text-center"
        >
          返回登录
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header className="text-center space-y-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-muted-foreground/60">
          [ REGISTER ]
        </p>
        <h1 className="text-2xl font-serif font-medium tracking-tight">注册</h1>
      </header>

      <div className="space-y-10">
        <RegisterForm form={registerForm} />

        {turnstileElement}

        <div className="text-center pt-4">
          <p className="text-[10px] font-mono text-muted-foreground/50 tracking-wider">
            已有账户?{" "}
            <Link
              to="/login"
              className="text-foreground hover:opacity-70 transition-opacity ml-1"
            >
              [ 前往登录 ]
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
