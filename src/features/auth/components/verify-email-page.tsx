import { Link } from "@tanstack/react-router";
import { AuthStatus } from "./auth-elements";
import { m } from "@/paraglide/messages";

export function VerifyEmailPage({
  status,
  error,
}: {
  status: "ANALYZING" | "SUCCESS" | "ERROR";
  error: string | undefined;
}) {
  if (status === "ANALYZING")
    return (
      <AuthStatus
        state="loading"
        title={m.verify_email_analyzing_title()}
        description={m.verify_email_analyzing()}
      />
    );
  if (status === "SUCCESS")
    return (
      <AuthStatus
        state="success"
        title={m.verify_email_success_title()}
        description={m.verify_email_success_desc()}
      >
        <Link to="/" className="auth-action fuwari-btn-primary">
          {m.verify_email_success_action()}
        </Link>
      </AuthStatus>
    );
  return (
    <AuthStatus
      state="error"
      title={m.verify_email_error_title()}
      description={
        error === "invalid_token"
          ? m.verify_email_error_invalid_token_desc()
          : m.verify_email_error_generic_desc()
      }
    >
      <Link to="/login" className="auth-action fuwari-btn-primary">
        {m.verify_email_error_action()}
      </Link>
      <p className="auth-note">{m.auth_verify_retry_hint()}</p>
    </AuthStatus>
  );
}
