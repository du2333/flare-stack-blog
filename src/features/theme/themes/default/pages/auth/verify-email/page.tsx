import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type { VerifyEmailPageProps } from "@/features/theme/contract/pages";

export function VerifyEmailPage({ status, error }: VerifyEmailPageProps) {
  return (
    <div className="space-y-12">
      <header className="text-center space-y-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-muted-foreground/60">
          [ VERIFY ]
        </p>
        <h1 className="text-2xl font-serif font-medium tracking-tight">
          {status === "ANALYZING" && "正在验证"}
          {status === "SUCCESS" && "验证成功"}
          {status === "ERROR" && "验证失败"}
        </h1>
      </header>

      <div className="flex flex-col items-center justify-center space-y-8 py-8">
        {status === "ANALYZING" && (
          <div className="flex items-center gap-3 text-muted-foreground/60 animate-in fade-in duration-500">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[10px] font-mono uppercase tracking-widest">
              正在核对令牌...
            </span>
          </div>
        )}

        {status === "SUCCESS" && (
          <div className="text-center space-y-8 animate-in fade-in duration-500">
            <p className="text-sm text-muted-foreground/70 font-light">
              您的邮箱已成功验证。
            </p>
            <Link
              to="/"
              className="block w-full py-4 bg-foreground text-background text-[10px] font-mono uppercase tracking-[0.3em] hover:opacity-80 transition-all text-center"
            >
              返回主页
            </Link>
          </div>
        )}

        {status === "ERROR" && (
          <div className="text-center space-y-8 animate-in fade-in duration-500">
            <p className="text-sm text-destructive/70 font-light">
              {error === "invalid_token"
                ? "验证链接已失效或已过期。"
                : "验证过程中发生错误，请重试。"}
            </p>
            <div className="space-y-4 w-full">
              <Link
                to="/login"
                className="block w-full py-4 border border-border/40 text-[10px] font-mono uppercase tracking-[0.3em] hover:border-foreground transition-all text-center"
              >
                返回登录
              </Link>
              <Link
                to="/login"
                className="block text-center text-[9px] font-mono text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                [ 重新发送验证邮件 ]
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
