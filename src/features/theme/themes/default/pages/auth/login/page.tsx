import { Link } from "@tanstack/react-router";
import type { LoginPageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";
import { LoginForm } from "./form";
import { SocialLogin } from "./social-login";

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
          [ {isEmailConfigured ? m.login_label() : m.login_auth_label()} ]
        </p>
        <h1 className="text-2xl font-serif font-medium tracking-tight">
          {isEmailConfigured ? m.login_title() : m.login_auth_title()}
        </h1>
        {!isEmailConfigured && (
          <p className="text-[10px] font-mono text-muted-foreground/40 tracking-wider">
            {m.login_only_third_party()}
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
              {m.login_no_account()}{" "}
              <Link
                to="/register"
                className="text-foreground hover:opacity-70 transition-opacity ml-1"
              >
                [ {m.login_register_now()} ]
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
