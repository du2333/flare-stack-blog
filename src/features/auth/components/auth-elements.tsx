import { AlertCircle, CheckCircle2, Loader2, MailCheck } from "lucide-react";
import {
  cloneElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

export function AuthHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="auth-heading">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </header>
  );
}
export function AuthField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactElement<InputHTMLAttributes<HTMLInputElement>>;
}) {
  const id = useId();
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, {
        id,
        "aria-required": true,
        "aria-invalid": !!error,
        "aria-describedby": error ? `${id}-error` : undefined,
      })}
      {error && (
        <p id={`${id}-error`} className="auth-error">
          {error}
        </p>
      )}
    </div>
  );
}
export function AuthStatus({
  state,
  title,
  description,
  children,
}: {
  state: "email" | "success" | "error" | "loading";
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  const Icon =
    state === "email"
      ? MailCheck
      : state === "success"
        ? CheckCircle2
        : state === "error"
          ? AlertCircle
          : Loader2;
  return (
    <div className="auth-page auth-status fuwari-content-enter">
      <div className="auth-status-icon" data-error={state === "error"}>
        <Icon
          size={28}
          strokeWidth={1.5}
          className={state === "loading" ? "animate-spin" : undefined}
        />
      </div>
      <div role={state === "error" ? "alert" : "status"}>
        <AuthHeading title={title} description={description} />
      </div>
      {children && <div className="auth-status-actions">{children}</div>}
    </div>
  );
}
