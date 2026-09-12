import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  LogOut,
  UserRound,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import type { useProfileForm } from "../hooks/use-profile-form";
import type { usePasswordForm } from "../hooks/use-password-form";
import type { useNotificationToggle } from "../hooks/use-notification-toggle";
import { m } from "@/paraglide/messages";
import "./profile-page.css";

interface ProfilePageProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role?: string | null;
  };
  profileForm: ReturnType<typeof useProfileForm>;
  passwordForm: ReturnType<typeof usePasswordForm> | null;
  notification: ReturnType<typeof useNotificationToggle>;
  logout: () => Promise<void>;
}

export function ProfilePage({
  user,
  profileForm,
  passwordForm,
  notification,
  logout,
}: ProfilePageProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const image = profileForm.image;
  return (
    <section className="account-page fuwari-card-base">
      <header className="account-heading">
        <h1>{m.account_title()}</h1>
        <Link to="/">
          <ArrowLeft size={16} />
          {m.account_back()}
        </Link>
        <p>{m.account_intro()}</p>
      </header>
      <form
        className="account-profile"
        onSubmit={profileForm.handleSubmit}
        noValidate
      >
        <div className="account-avatar-preview">
          <div className="account-avatar">
            {/^https?:\/\//i.test(image) && image !== failedImage ? (
              <img src={image} alt="" onError={() => setFailedImage(image)} />
            ) : (
              <UserRound size={36} strokeWidth={1.5} />
            )}
          </div>
          <span>{m.account_avatar_preview()}</span>
        </div>
        <fieldset disabled={profileForm.isSubmitting}>
          <Field
            name="name"
            label={m.profile_name()}
            error={profileForm.errors.name?.message}
          >
            <input
              id="account-name"
              {...profileForm.register("name")}
              autoComplete="nickname"
              maxLength={20}
              aria-required="true"
              aria-invalid={!!profileForm.errors.name}
              aria-describedby={
                profileForm.errors.name ? "account-name-error" : undefined
              }
            />
          </Field>
          <Field
            name="image"
            label={m.profile_avatar_url()}
            error={profileForm.errors.image?.message}
          >
            <input
              id="account-image"
              {...profileForm.register("image")}
              type="url"
              placeholder="https://example.com/avatar.png"
              aria-invalid={!!profileForm.errors.image}
              aria-describedby={
                profileForm.errors.image ? "account-image-error" : undefined
              }
            />
          </Field>
          <div className="account-email">
            <span>{m.account_email()}</span>
            <p>{user.email}</p>
          </div>
          <div className="account-save">
            <button
              type="submit"
              className="fuwari-btn-primary"
              disabled={!profileForm.isDirty || profileForm.isSubmitting}
            >
              {profileForm.isSubmitting && (
                <Loader2 size={16} className="animate-spin" />
              )}
              {m.account_save()}
            </button>
            {profileForm.feedback &&
              (profileForm.feedback.error || !profileForm.isDirty) && (
                <p
                  className="account-feedback"
                  data-error={profileForm.feedback.error}
                  role={profileForm.feedback.error ? "alert" : "status"}
                >
                  {profileForm.feedback.message}
                </p>
              )}
          </div>
        </fieldset>
      </form>
      <section className="account-setting">
        <div className="account-setting-row">
          <div>
            <h2>{m.profile_email_notify()}</h2>
            <p>
              {notification.isError
                ? m.profile_notify_status_failed()
                : notification.isLoading
                  ? m.profile_notify_status_loading()
                  : !notification.available
                    ? m.profile_notify_unavailable()
                    : m.profile_email_notify_desc_fuwari()}
            </p>
          </div>
          {notification.isError ? (
            <button
              type="button"
              className="account-text-button"
              onClick={notification.reload}
            >
              {m.account_retry()}
            </button>
          ) : (
            <button
              type="button"
              role="switch"
              aria-checked={notification.enabled === true}
              aria-label={m.profile_email_notify()}
              className="account-switch"
              disabled={
                !notification.available ||
                notification.isLoading ||
                notification.isPending ||
                notification.enabled === undefined
              }
              onClick={notification.toggle}
            >
              <span>
                {(notification.isLoading || notification.isPending) && (
                  <Loader2 size={12} className="animate-spin" />
                )}
              </span>
            </button>
          )}
        </div>
      </section>
      {passwordForm && <PasswordSection form={passwordForm} />}
      <footer className="account-footer">
        <button
          type="button"
          disabled={loggingOut}
          onClick={async () => {
            setLoggingOut(true);
            try {
              await logout();
            } finally {
              setLoggingOut(false);
            }
          }}
        >
          <LogOut size={16} />
          {m.profile_logout_fuwari()}
        </button>
      </footer>
    </section>
  );
}
function PasswordSection({
  form,
}: {
  form: NonNullable<ProfilePageProps["passwordForm"]>;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    form.clear();
    triggerRef.current?.focus();
  };
  return (
    <section className="account-setting">
      <div className="account-setting-row">
        <div>
          <h2>{m.profile_password_security()}</h2>
          <p>{m.account_password_hint()}</p>
        </div>
        <button
          ref={triggerRef}
          type="button"
          className="account-text-button"
          aria-expanded={open}
          aria-controls="account-password-fields"
          disabled={form.isSubmitting}
          onClick={() => (open ? close() : setOpen(true))}
        >
          {open ? m.common_cancel() : m.account_change_password()}
          <ChevronDown
            size={16}
            className={open ? "account-chevron-open" : ""}
          />
        </button>
      </div>
      <div
        id="account-password-fields"
        className="account-password-disclosure"
        data-open={open}
        inert={!open}
        aria-hidden={!open}
      >
        <div>
          <form
            className="account-password-form"
            onSubmit={form.handleSubmit}
            noValidate
          >
            <fieldset disabled={form.isSubmitting}>
              <Field
                name="currentPassword"
                label={m.profile_current_password()}
                error={form.errors.currentPassword?.message}
              >
                <input
                  id="account-currentPassword"
                  type="password"
                  autoComplete="current-password"
                  {...form.register("currentPassword")}
                  aria-required="true"
                  aria-invalid={!!form.errors.currentPassword}
                  aria-describedby={
                    form.errors.currentPassword
                      ? "account-currentPassword-error"
                      : undefined
                  }
                />
              </Field>
              <div className="account-password-pair">
                <Field
                  name="newPassword"
                  label={m.profile_new_password()}
                  error={form.errors.newPassword?.message}
                >
                  <input
                    id="account-newPassword"
                    type="password"
                    autoComplete="new-password"
                    {...form.register("newPassword")}
                    aria-required="true"
                    aria-invalid={!!form.errors.newPassword}
                    aria-describedby={
                      form.errors.newPassword
                        ? "account-newPassword-error"
                        : undefined
                    }
                  />
                </Field>
                <Field
                  name="confirmPassword"
                  label={m.profile_confirm_password()}
                  error={form.errors.confirmPassword?.message}
                >
                  <input
                    id="account-confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    {...form.register("confirmPassword")}
                    aria-required="true"
                    aria-invalid={!!form.errors.confirmPassword}
                    aria-describedby={
                      form.errors.confirmPassword
                        ? "account-confirmPassword-error"
                        : undefined
                    }
                  />
                </Field>
              </div>
              <div className="account-save">
                <button type="submit" className="fuwari-btn-primary">
                  {form.isSubmitting && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {m.profile_update_password_fuwari()}
                </button>
              </div>
              {form.feedback && (
                <p
                  className="account-feedback"
                  data-error={form.feedback.error}
                  role={form.feedback.error ? "alert" : "status"}
                >
                  {form.feedback.message}
                </p>
              )}
            </fieldset>
          </form>
        </div>
      </div>
    </section>
  );
}
function Field({
  name,
  label,
  error,
  children,
}: {
  name: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="account-field">
      <label htmlFor={`account-${name}`}>{label}</label>
      {children}
      {error && (
        <p
          className="account-feedback"
          data-error="true"
          id={`account-${name}-error`}
        >
          {error}
        </p>
      )}
    </div>
  );
}
