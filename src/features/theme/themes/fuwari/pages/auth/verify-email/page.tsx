import { Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { VerifyEmailPageProps } from "@/features/theme/contract/pages";

export function VerifyEmailPage({ status, error }: VerifyEmailPageProps) {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold fuwari-text-90">
          {status === "ANALYZING" && "正在验证您的邮箱"}
          {status === "SUCCESS" && "邮箱验证成功"}
          {status === "ERROR" && "邮箱验证失败"}
        </h1>
      </div>

      <div className="flex flex-col items-center justify-center p-4">
        {status === "ANALYZING" && (
          <div className="flex items-center gap-3 text-(--fuwari-primary) animate-in fade-in duration-500 py-8">
            <Loader2 size={32} strokeWidth={1.5} className="animate-spin" />
            <span className="text-sm font-bold tracking-widest">
              核对令牌中...
            </span>
          </div>
        )}

        {status === "SUCCESS" && (
          <div className="flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-500 w-full py-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mb-2">
              <CheckCircle2 size={32} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium fuwari-text-50 leading-relaxed max-w-xs mx-auto">
              感谢注册！您的邮箱已成功激活。欢迎开始使用我们的服务。
            </p>
            <Link
              to="/"
              className="w-full py-3.5 rounded-xl fuwari-btn-primary font-bold text-sm transition-all active:scale-[0.98] mt-4"
            >
              返回主页
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
                ? "验证链接已失效或已过期，请重新申请验证。"
                : "验证过程中发生未知错误，请重试。"}
            </p>
            <div className="space-y-4 w-full flex flex-col pt-4">
              <Link
                to="/login"
                className="w-full py-3.5 rounded-xl fuwari-btn-primary font-bold text-sm transition-all active:scale-[0.98]"
              >
                返回登录
              </Link>
              <Link
                to="/login"
                className="text-xs font-medium text-(--fuwari-primary) hover:underline"
              >
                重新发送验证邮件
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
