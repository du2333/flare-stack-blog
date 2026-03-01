import { Link } from "@tanstack/react-router";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import type { VerifyEmailPageProps } from "@/features/theme/contract/pages";

export function VerifyEmailPage({ status, error }: VerifyEmailPageProps) {
  return (
    <div className="space-y-6 text-center">
      {/* Status Icon */}
      {status === "ANALYZING" && (
        <div className="py-8">
          <Loader2 className="w-16 h-16 text-[var(--cuckoo-primary)] animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-bold cuckoo-text-primary mb-2">
            验证中...
          </h1>
          <p className="cuckoo-text-secondary text-sm">
            请稍后，正在验证您的邮箱
          </p>
        </div>
      )}

      {status === "SUCCESS" && (
        <div className="py-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold cuckoo-text-primary mb-2">
            验证成功
          </h1>
          <p className="cuckoo-text-secondary text-sm mb-6">
            您的邮箱已成功验证
          </p>
          <Link to="/login" className="cuckoo-btn cuckoo-btn-primary">
            返回登录
          </Link>
        </div>
      )}

      {status === "ERROR" && (
        <div className="py-8">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold cuckoo-text-primary mb-2">
            验证失败
          </h1>
          <p className="cuckoo-text-secondary text-sm mb-2">
            {error || "验证链接已失效或无效"}
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Link to="/login" className="cuckoo-btn cuckoo-btn-secondary">
              返回登录
            </Link>
            <Link to="/register" className="cuckoo-btn cuckoo-btn-primary">
              重新注册
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
