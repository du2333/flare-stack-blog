import { Link } from "@tanstack/react-router";
import {
  Check,
  Clock,
  ExternalLink,
  Globe,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useRef, useState, type ComponentProps } from "react";
import { Turnstile } from "@/components/common/turnstile";
import { Button, buttonClass } from "@/components/ui/button";
import DropdownMenu from "@/components/ui/dropdown-menu";
import { FormField } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { ThemedPageHeading } from "@/features/theme/components/themed-page-heading";
import { Spinner } from "@/components/ui/spinner";
import { StatusIcon } from "@/components/ui/status-icon";
import type { FriendLink } from "@/lib/db/schema";
import { useContentMotion } from "@/hooks/use-motion";
import { useFriendLinkSubmitForm } from "../hooks/use-friend-link-submit-form";
import { StatusText } from "@/components/ui/status-text";
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
    <section className="friend-application fuwari-card-base fuwari-card-panel">
      <ThemedPageHeading
        title={m.friend_link_submit_title()}
        back={{ to: "/friend-links", label: m.friend_link_back_to_list() }}
        description={m.friend_apply_intro()}
      />
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
            <Spinner size={22} />
            {m.friend_apply_loading()}
          </div>
        ) : isError ? (
          <div className="friend-application-message" role="alert">
            <p>{m.friend_apply_load_failed()}</p>
            <Button size="lg" onClick={reload} disabled={isRefreshing}>
              {m.friend_apply_refresh()}
            </Button>
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
            <StatusIcon
              icon={
                current.status === "pending"
                  ? Clock
                  : current.status === "approved"
                    ? Check
                    : XCircle
              }
              tone={current.status === "rejected" ? "danger" : "primary"}
            />
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
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setEditingId(current.id)}
                >
                  {m.friend_apply_revise()}
                </Button>
              ) : current.status === "approved" ? (
                <Link
                  to="/friend-links"
                  className={buttonClass({ variant: "primary", size: "lg" })}
                >
                  {m.friend_apply_view()}
                </Link>
              ) : null}
              <Button
                size="lg"
                onClick={reload}
                loading={isRefreshing}
                icon={<RefreshCw size={16} />}
              >
                {m.friend_apply_refresh()}
              </Button>
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
          <FormField
            label={m.friend_link_field_site_name()}
            error={form.errors.siteName?.message}
            required
          >
            <Input
              {...form.register("siteName")}
              maxLength={100}
              autoComplete="organization"
              placeholder={m.friend_link_placeholder_site_name_fuwari()}
            />
          </FormField>
          <FormField
            label={m.friend_link_field_site_url_fuwari()}
            error={form.errors.siteUrl?.message}
            required
          >
            <Input
              {...form.register("siteUrl")}
              type="url"
              autoComplete="url"
              placeholder="https://example.com"
            />
          </FormField>
        </div>
        <FormField
          label={m.friend_link_field_description()}
          error={form.errors.description?.message}
          optional={m.friend_apply_optional()}
        >
          <Textarea
            {...form.register("description")}
            rows={3}
            maxLength={300}
            placeholder={m.friend_link_placeholder_description_fuwari()}
          />
        </FormField>
        <FormField
          label={m.friend_link_field_logo_url()}
          error={form.errors.logoUrl?.message}
          optional={m.friend_apply_optional()}
        >
          <LogoUrlInput
            {...form.register("logoUrl")}
            type="url"
            placeholder="https://example.com/avatar.png"
            preview={form.logoUrl}
          />
        </FormField>
      </fieldset>
      <div className="friend-application-verification">
        <Turnstile {...form.turnstileProps} />
      </div>
      {form.submitError && (
        <StatusText error className="friend-application-error">
          {form.submitError}
        </StatusText>
      )}
      <div className="friend-application-actions">
        {onCancel && (
          <Button size="lg" onClick={onCancel} disabled={form.isSubmitting}>
            {m.common_cancel()}
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="friend-application-submit"
          disabled={form.turnstilePending}
          loading={form.isSubmitting}
        >
          {form.isSubmitting
            ? m.friend_apply_sending()
            : initial
              ? m.friend_apply_resubmit()
              : m.friend_link_submit_form_title()}
        </Button>
      </div>
      <p className="friend-application-hint">{m.friend_apply_after_submit()}</p>
    </form>
  );
}
function LogoUrlInput({
  preview,
  ...props
}: ComponentProps<typeof Input> & { preview: string }) {
  return (
    <div className="friend-application-logo">
      <Input {...props} />
      <SiteIcon src={preview} />
    </div>
  );
}
