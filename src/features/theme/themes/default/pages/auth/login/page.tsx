import { Link } from "@tanstack/react-router";
import { LoginForm } from "./form";
import { SocialLogin } from "./social-login";
import type { LoginPageProps } from "@/features/theme/contract/pages";

export function LoginPage({
  isEmailConfigured,
  loginForm,
  socialLogin,
  turnstileElement,
}: LoginPageProps) {
  return (
    <div className="space-y-12">
      <header className="text-center space-y-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-muted-foreground/60">
          [ {isEmailConfigured ? "LOGIN" : "AUTH"} ]
        </p>
        <h1 className="text-2xl font-serif font-medium tracking-tight">
          {isEmailConfigured ? "登录" : "身份验证"}
        </h1>
        {!isEmailConfigured && (
          <p className="text-[10px] font-mono text-muted-foreground/40 tracking-wider">
            仅支持第三方提供商
          </p>
        )}
      </header>

      <div className={isEmailConfigured ? "space-y-10" : "space-y-0"}>
        {isEmailConfigured && (
          <LoginForm form={loginForm} isEmailConfigured={isEmailConfigured} />
        )}

        <SocialLogin
          isLoading={socialLogin.isLoading}
          turnstilePending={socialLogin.turnstilePending}
          handleGithubLogin={socialLogin.handleGithubLogin}
          showDivider={isEmailConfigured}
        />

        {turnstileElement}

        {isEmailConfigured && (
          <div className="text-center pt-8">
            <p className="text-[10px] font-mono text-muted-foreground/50 tracking-wider">
              没有账户?{" "}
              <Link
                to="/register"
                className="text-foreground hover:opacity-70 transition-opacity ml-1"
              >
                [ 立即注册 ]
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
