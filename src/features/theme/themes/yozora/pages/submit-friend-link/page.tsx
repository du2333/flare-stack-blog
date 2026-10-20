import { ClientOnly, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Turnstile } from "@/components/common/turnstile";
import type {
  MyFriendLink,
  SubmitFriendLinkPageProps,
} from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";

/** 状态：小圆点 + 等宽字，不用彩色胶囊 */
function StatusMark({ status }: { status: MyFriendLink["status"] }) {
  const tone =
    status === "approved"
      ? "var(--yz-gold)"
      : status === "rejected"
        ? "var(--yz-shinku)"
        : "var(--yz-ink-faint)";
  const label =
    status === "approved"
      ? m.friend_link_status_approved()
      : status === "rejected"
        ? m.friend_link_status_rejected_fuwari()
        : m.friend_link_status_pending();
  return (
    <span className="yz-letter__status" style={{ ["--st" as string]: tone }}>
      <span className="yz-letter__status-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

/**
 * 申请友链 = 写一封信：信纸式表单（等宽小字标签 + 下划线输入），
 * 右侧"我的投稿"做成页边批注。
 */
export function SubmitFriendLinkPage({
  myLinks,
  form,
}: SubmitFriendLinkPageProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 书脊页头 */}
      <header className="yz-book__head fuwari-onload-animation">
        <div className="yz-hero__pagemark">
          <svg width="34" height="10" viewBox="0 0 34 10" fill="none" aria-hidden="true">
            <path d="M1 5h12" stroke="currentColor" strokeWidth=".8" />
            <path
              d="M18 1.6c3.2 0 3.2 6.8 6.4 6.8s3.2-6.8 6.4-6.8"
              stroke="var(--yz-gold)"
              strokeWidth=".8"
              fill="none"
            />
          </svg>
          <span>Letter · 手 紙</span>
        </div>
        <h1 className="yz-book__title">{m.friend_link_submit_title()}</h1>
        <p className="yz-book__desc">{m.friend_link_submit_desc()}</p>
        <Link to="/friend-links" className="yz-hero__line mt-4 inline-block">
          ← {m.friend_link_back_to_list()}
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 信纸 */}
        <div className="lg:col-span-3 fuwari-card-base p-6 md:p-9 yz-letter fuwari-onload-animation" style={{ animationDelay: "120ms" }}>
          <div className="yz-letter__head">
            <span className="yz-hero__pagemark">To. 雨月の小窝</span>
            <span className="yz-hero__pagemark">
              {m.friend_link_submit_form_title()}
            </span>
          </div>

          <form onSubmit={form.handleSubmit} className="yz-letter__form">
            <label className="yz-field">
              <span className="yz-field__label">
                {m.friend_link_field_site_name()}
                <i>*</i>
              </span>
              <input
                id="siteName"
                {...form.register("siteName")}
                placeholder={m.friend_link_placeholder_site_name_fuwari()}
              />
              {form.errors.siteName && (
                <span className="yz-field__err">{form.errors.siteName.message}</span>
              )}
            </label>

            <label className="yz-field">
              <span className="yz-field__label">
                {m.friend_link_field_site_url_fuwari()}
                <i>*</i>
              </span>
              <input
                {...form.register("siteUrl")}
                type="url"
                placeholder={m.friend_link_placeholder_site_url_fuwari()}
              />
              {form.errors.siteUrl && (
                <span className="yz-field__err">{form.errors.siteUrl.message}</span>
              )}
            </label>

            <label className="yz-field">
              <span className="yz-field__label">
                {m.friend_link_field_description()}
              </span>
              <input
                {...form.register("description")}
                placeholder={m.friend_link_placeholder_description_fuwari()}
              />
              {form.errors.description && (
                <span className="yz-field__err">
                  {form.errors.description.message}
                </span>
              )}
            </label>

            <label className="yz-field">
              <span className="yz-field__label">
                {m.friend_link_field_logo_url()}
              </span>
              <input
                {...form.register("logoUrl")}
                type="url"
                placeholder={m.friend_link_placeholder_logo_url_fuwari()}
              />
              {form.errors.logoUrl && (
                <span className="yz-field__err">{form.errors.logoUrl.message}</span>
              )}
            </label>

            <label className="yz-field">
              <span className="yz-field__label">
                {m.friend_link_field_contact_email()}
                <i>*</i>
              </span>
              <input
                {...form.register("contactEmail")}
                type="email"
                placeholder={m.friend_link_placeholder_contact_email_fuwari()}
              />
              {form.errors.contactEmail && (
                <span className="yz-field__err">
                  {form.errors.contactEmail.message}
                </span>
              )}
            </label>

            <div className="pt-3">
              <Turnstile {...form.turnstileProps} />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={form.isSubmitting}
                className="yz-hero__solid w-full justify-center flex"
              >
                {form.isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  m.friend_link_submit_form_title()
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 页边批注：我的投稿 */}
        <aside
          className="lg:col-span-2 yz-letter__margin fuwari-onload-animation"
          style={{ animationDelay: "220ms" }}
        >
          <h2 className="yz-letter__margin-title">
            {m.friend_link_my_submissions()}
          </h2>

          {myLinks.length > 0 ? (
            <div className="yz-letter__notes">
              {myLinks.map((link) => (
                <div key={link.id} className="yz-note">
                  <div className="yz-note__top">
                    <span className="yz-note__name">{link.siteName}</span>
                    <StatusMark status={link.status} />
                  </div>
                  <a
                    href={link.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="yz-note__url"
                  >
                    {link.siteUrl}
                  </a>
                  {link.status === "rejected" && link.rejectionReason && (
                    <p className="yz-note__reason">
                      {m.friend_link_rejection_reason_fuwari()}
                      {link.rejectionReason}
                    </p>
                  )}
                  <div className="yz-note__date">
                    {m.friend_link_submitted_at()}{" "}
                    <ClientOnly fallback="-">
                      {new Date(link.createdAt).toLocaleDateString()}
                    </ClientOnly>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="yz-note yz-note--empty">
              {m.friend_link_no_submissions()}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
