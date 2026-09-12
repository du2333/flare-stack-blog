import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { Turnstile } from "@/components/common/turnstile";
import DropdownMenu from "@/components/ui/dropdown-menu";
import type { FriendLink } from "@/lib/db/schema";
import { useContentMotion } from "@/hooks/use-motion";
import { useFriendLinkSubmitForm } from "../hooks/use-friend-link-submit-form";
import { m } from "@/paraglide/messages";
import "./submit-friend-link-page.css";

export function SubmitFriendLinkPage({
  myLinks,
  isLoading,
  isError,
  isRefreshing,
  reload,
}: {
  myLinks: FriendLink[];
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  reload: () => void;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const current = myLinks.find((link) => link.id === selectedId) ?? myLinks[0];
  const editing = current?.status === "rejected" && editingId === current.id;
  const bodyRef = useRef<HTMLDivElement>(null);
  useContentMotion(
    bodyRef,
    `${isLoading}:${current?.id}:${current?.status}:${editing}`,
  );
  return (
    <section className="friend-application fuwari-card-base">
      <header className="friend-application-heading">
        <h1>{m.friend_link_submit_title()}</h1>
        <Link to="/friend-links">
          <ArrowLeft size={16} />
          {m.friend_link_back_to_list()}
        </Link>
        <p>{m.friend_apply_intro()}</p>
      </header>
      {myLinks.length > 1 && (
        <div className="friend-application-switcher">
          <DropdownMenu
            value={String(current.id)}
            options={myLinks.map((link) => ({
              value: String(link.id),
              label: link.siteName,
            }))}
            ariaLabel={m.friend_apply_choose_site()}
            onChange={(value) => {
              setSelectedId(Number(value));
              setEditingId(null);
            }}
          />
        </div>
      )}
      <div ref={bodyRef}>
        {isLoading ? (
          <div className="friend-application-loading" aria-busy="true">
            <Loader2 className="animate-spin" size={22} />
            {m.friend_apply_loading()}
          </div>
        ) : isError ? (
          <div className="friend-application-message" role="alert">
            <p>{m.friend_apply_load_failed()}</p>
            <button
              type="button"
              className="fuwari-btn-regular"
              onClick={reload}
              disabled={isRefreshing}
            >
              {m.friend_apply_refresh()}
            </button>
          </div>
        ) : !current || editing ? (
          <ApplicationForm
            key={current?.id ?? "new"}
            initial={editing ? current : undefined}
            onCancel={editing ? () => setEditingId(null) : undefined}
            onSubmitted={() => setEditingId(null)}
          />
        ) : (
          <div className="friend-application-status" role="status">
            <div
              className="friend-application-state-icon"
              data-status={current.status}
            >
              {current.status === "pending" ? (
                <Clock size={26} />
              ) : current.status === "approved" ? (
                <Check size={26} />
              ) : (
                <XCircle size={26} />
              )}
            </div>
            <h2>
              {current.status === "pending"
                ? m.friend_apply_pending()
                : current.status === "approved"
                  ? m.friend_apply_approved()
                  : m.friend_apply_rejected()}
            </h2>
            <p>
              {current.status === "pending"
                ? m.friend_apply_pending_desc()
                : current.status === "approved"
                  ? m.friend_apply_approved_desc()
                  : m.friend_apply_rejected_desc()}
            </p>
            <div className="friend-application-site">
              <SiteIcon src={current.logoUrl || ""} />
              <div>
                <strong>{current.siteName}</strong>
                <a
                  href={current.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {current.siteUrl}
                  <ExternalLink size={14} />
                </a>
                {current.description && <p>{current.description}</p>}
              </div>
            </div>
            {current.status === "rejected" && current.rejectionReason && (
              <div className="friend-application-reason">
                <strong>{m.friend_links_reject_reason()}</strong>
                <p>{current.rejectionReason}</p>
              </div>
            )}
            <div className="friend-application-actions">
              {current.status === "rejected" ? (
                <button
                  type="button"
                  className="fuwari-btn-primary"
                  onClick={() => setEditingId(current.id)}
                >
                  {m.friend_apply_revise()}
                </button>
              ) : current.status === "approved" ? (
                <Link to="/friend-links" className="fuwari-btn-primary">
                  {m.friend_apply_view()}
                </Link>
              ) : null}
              <button
                type="button"
                className="fuwari-btn-regular"
                onClick={reload}
                disabled={isRefreshing}
              >
                <RefreshCw
                  size={16}
                  className={isRefreshing ? "animate-spin" : ""}
                />
                {m.friend_apply_refresh()}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SiteIcon({ src }: { src: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const valid = /^https?:\/\//i.test(src);
  return (
    <span className="friend-application-icon">
      {valid && failed !== src ? (
        <img src={src} alt="" onError={() => setFailed(src)} />
      ) : (
        <Globe size={24} strokeWidth={1.5} />
      )}
    </span>
  );
}

function ApplicationForm({
  initial,
  onCancel,
  onSubmitted,
}: {
  initial?: FriendLink;
  onCancel?: () => void;
  onSubmitted: () => void;
}) {
  const form = useFriendLinkSubmitForm(
    initial
      ? {
          id: initial.id,
          siteName: initial.siteName,
          siteUrl: initial.siteUrl,
          description: initial.description || "",
          logoUrl: initial.logoUrl || "",
        }
      : undefined,
    onSubmitted,
  );
  return (
    <form
      className="friend-application-form"
      onSubmit={form.handleSubmit}
      noValidate
    >
      <fieldset disabled={form.isSubmitting}>
        <div className="friend-application-core">
          <Field
            name="siteName"
            label={m.friend_link_field_site_name()}
            error={form.errors.siteName?.message}
            required
          >
            <input
              id="apply-siteName"
              aria-required="true"
              {...form.register("siteName")}
              maxLength={100}
              autoComplete="organization"
              aria-invalid={!!form.errors.siteName}
              aria-describedby={
                form.errors.siteName ? "apply-siteName-error" : undefined
              }
              placeholder={m.friend_link_placeholder_site_name_fuwari()}
            />
          </Field>
          <Field
            name="siteUrl"
            label={m.friend_link_field_site_url_fuwari()}
            error={form.errors.siteUrl?.message}
            required
          >
            <input
              id="apply-siteUrl"
              aria-required="true"
              {...form.register("siteUrl")}
              type="url"
              autoComplete="url"
              aria-invalid={!!form.errors.siteUrl}
              aria-describedby={
                form.errors.siteUrl ? "apply-siteUrl-error" : undefined
              }
              placeholder="https://example.com"
            />
          </Field>
        </div>
        <Field
          name="description"
          label={m.friend_link_field_description()}
          error={form.errors.description?.message}
        >
          <textarea
            id="apply-description"
            {...form.register("description")}
            rows={3}
            maxLength={300}
            aria-invalid={!!form.errors.description}
            aria-describedby={
              form.errors.description ? "apply-description-error" : undefined
            }
            placeholder={m.friend_link_placeholder_description_fuwari()}
          />
        </Field>
        <Field
          name="logoUrl"
          label={m.friend_link_field_logo_url()}
          error={form.errors.logoUrl?.message}
        >
          <div className="friend-application-logo">
            <input
              id="apply-logoUrl"
              {...form.register("logoUrl")}
              type="url"
              aria-invalid={!!form.errors.logoUrl}
              aria-describedby={
                form.errors.logoUrl ? "apply-logoUrl-error" : undefined
              }
              placeholder="https://example.com/avatar.png"
            />
            <SiteIcon src={form.logoUrl} />
          </div>
        </Field>
      </fieldset>
      <div className="friend-application-verification">
        <Turnstile {...form.turnstileProps} />
      </div>
      {form.submitError && (
        <p className="friend-application-error" role="alert">
          {form.submitError}
        </p>
      )}
      <div className="friend-application-actions">
        {onCancel && (
          <button
            type="button"
            className="fuwari-btn-regular"
            onClick={onCancel}
            disabled={form.isSubmitting}
          >
            {m.common_cancel()}
          </button>
        )}
        <button
          type="submit"
          className="fuwari-btn-primary friend-application-submit"
          disabled={form.isSubmitting || form.turnstilePending}
        >
          {form.isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {form.isSubmitting
            ? m.friend_apply_sending()
            : initial
              ? m.friend_apply_resubmit()
              : m.friend_link_submit_form_title()}
        </button>
      </div>
      <p className="friend-application-hint">{m.friend_apply_after_submit()}</p>
    </form>
  );
}
function Field({
  name,
  label,
  error,
  required,
  children,
}: {
  name: string;
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="friend-application-field">
      <label htmlFor={`apply-${name}`}>
        {label}
        {required ? (
          <span aria-hidden="true"> *</span>
        ) : (
          <small>{m.friend_apply_optional()}</small>
        )}
      </label>
      {children}
      {error && (
        <p id={`apply-${name}-error`} className="friend-application-error">
          {error}
        </p>
      )}
    </div>
  );
}
