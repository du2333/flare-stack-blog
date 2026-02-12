import { Github, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { usePreviousLocation } from "@/hooks/use-previous-location";
import { authClient } from "@/lib/auth/auth.client";

interface SocialLoginProps {
  redirectTo?: string;
  showDivider?: boolean;
  turnstileToken?: string | null;
  turnstilePending?: boolean;
  resetTurnstile?: () => void;
}

export function SocialLogin({
  redirectTo,
  showDivider = true,
  turnstileToken = null,
  turnstilePending = false,
  resetTurnstile,
}: SocialLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const previousLocation = usePreviousLocation();

  const handleGithubLogin = async () => {
    if (isLoading) return;

    setIsLoading(true);

    const { error } = await authClient.signIn.social({
      provider: "github",
      errorCallbackURL: `${window.location.origin}/login`,
      callbackURL: `${window.location.origin}${redirectTo ?? previousLocation}`,
      fetchOptions: {
        headers: { "X-Turnstile-Token": turnstileToken || "" },
      },
    });

    resetTurnstile?.();

    if (error) {
      if (error.message?.includes("Turnstile")) {
        toast.error("人机验证失败", { description: "请等待验证完成后重试" });
      } else {
        toast.error("第三方登录失败", { description: error.message });
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      {showDivider && (
        <div className="relative flex items-center">
          <div className="grow h-px bg-border/30"></div>
          <span className="shrink-0 mx-4 text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40">
            或者
          </span>
          <div className="grow h-px bg-border/30"></div>
        </div>
      )}

      <button
        type="button"
        onClick={handleGithubLogin}
        disabled={isLoading || turnstilePending}
        className={`group w-full py-4 border border-border/40 flex items-center justify-center gap-3 transition-all hover:border-foreground disabled:opacity-50 disabled:cursor-not-allowed ${
          !showDivider
            ? "bg-foreground text-background border-transparent hover:opacity-80"
            : ""
        }`}
      >
        {isLoading || turnstilePending ? (
          <Loader2
            size={14}
            className={`${showDivider ? "text-muted-foreground" : "text-background"} animate-spin`}
          />
        ) : (
          <Github size={14} strokeWidth={1.5} />
        )}

        <span className="text-[10px] font-mono uppercase tracking-widest">
          {isLoading
            ? "正在连接..."
            : turnstilePending
              ? "验证中..."
              : "GitHub 登录"}
        </span>
      </button>
      {!showDivider && (
        <p className="text-[9px] font-mono text-muted-foreground/30 text-center">
          Powered by GitHub OAuth
        </p>
      )}
    </div>
  );
}
