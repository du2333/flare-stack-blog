import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  Link as LinkIcon,
  Loader2,
  PlusCircle,
  XCircle,
} from "lucide-react";
import { Turnstile } from "@/components/common/turnstile";
import type {
  MyFriendLink,
  SubmitFriendLinkPageProps,
} from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";

function StatusBadge({ status }: { status: MyFriendLink["status"] }) {
  switch (status) {
    case "approved":
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {m.friend_link_status_approved()}
        </span>
      );
    case "rejected":
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-medium">
          <XCircle className="w-3.5 h-3.5" />
          {m.friend_link_status_rejected_fuwari()}
        </span>
      );
    case "pending":
    default:
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs font-medium">
          <Clock className="w-3.5 h-3.5" />
          {m.friend_link_status_pending()}
        </span>
      );
  }
}

export function SubmitFriendLinkPage({
  myLinks,
  form,
}: SubmitFriendLinkPageProps) {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header */}
      <div
        className="fuwari-card-base p-6 md:p-8 relative overflow-hidden flex flex-col items-center justify-center min-h-48 fuwari-onload-animation bg-linear-to-br from-(--fuwari-primary)/5 to-transparent"
        style={{ animationDelay: "150ms" }}
      >
        <h1 className="text-3xl font-bold fuwari-text-90 mb-4 z-10 transition-colors">
          {m.friend_link_submit_title()}
        </h1>
        <p className="fuwari-text-50 text-center max-w-xl z-10 transition-colors">
          {m.friend_link_submit_desc()}
        </p>
        <Link
          to="/friend-links"
          className="mt-6 z-10 flex items-center gap-2 text-sm text-(--fuwari-primary) hover:underline transition-all"
        >
          <LinkIcon className="w-4 h-4" />
          {m.friend_link_back_to_list()}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Form Section */}
        <div
          className="lg:col-span-3 fuwari-card-base p-6 md:p-8 fuwari-onload-animation"
          style={{ animationDelay: "300ms" }}
        >
          <h2 className="text-xl font-bold fuwari-text-90 mb-6 flex items-center gap-2 transition-colors">
            <PlusCircle className="w-5 h-5 text-(--fuwari-primary)" />
            {m.friend_link_submit_form_title()}
          </h2>

          <form onSubmit={form.handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="siteName"
                className="block text-sm font-medium fuwari-text-75 mb-1.5 transition-colors"
              >
                {m.friend_link_field_site_name()}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                id="siteName"
                {...form.register("siteName")}
                className="w-full px-4 py-2.5 rounded-xl border border-(--fuwari-input-border) bg-(--fuwari-input-bg) focus:outline-none focus:ring-2 focus:ring-(--fuwari-primary)/50 focus:border-transparent transition-all"
                placeholder={m.friend_link_placeholder_site_name_fuwari()}
              />
              {form.errors.siteName && (
                <p className="mt-1.5 text-sm text-red-500">
                  {form.errors.siteName.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium fuwari-text-75 mb-1.5 transition-colors">
                {m.friend_link_field_site_url_fuwari()}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                {...form.register("siteUrl")}
                type="url"
                className="w-full px-4 py-2.5 rounded-xl border border-(--fuwari-input-border) bg-(--fuwari-input-bg) focus:outline-none focus:ring-2 focus:ring-(--fuwari-primary)/50 focus:border-transparent transition-all"
                placeholder={m.friend_link_placeholder_site_url_fuwari()}
              />
              {form.errors.siteUrl && (
                <p className="mt-1.5 text-sm text-red-500">
                  {form.errors.siteUrl.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium fuwari-text-75 mb-1.5 transition-colors">
                {m.friend_link_field_description()}
              </label>
              <input
                {...form.register("description")}
                className="w-full px-4 py-2.5 rounded-xl border border-(--fuwari-input-border) bg-(--fuwari-input-bg) focus:outline-none focus:ring-2 focus:ring-(--fuwari-primary)/50 focus:border-transparent transition-all"
                placeholder={m.friend_link_placeholder_description_fuwari()}
              />
              {form.errors.description && (
                <p className="mt-1.5 text-sm text-red-500">
                  {form.errors.description.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium fuwari-text-75 mb-1.5 transition-colors">
                {m.friend_link_field_logo_url()}
              </label>
              <input
                {...form.register("logoUrl")}
                type="url"
                className="w-full px-4 py-2.5 rounded-xl border border-(--fuwari-input-border) bg-(--fuwari-input-bg) focus:outline-none focus:ring-2 focus:ring-(--fuwari-primary)/50 focus:border-transparent transition-all"
                placeholder={m.friend_link_placeholder_logo_url_fuwari()}
              />
              {form.errors.logoUrl && (
                <p className="mt-1.5 text-sm text-red-500">
                  {form.errors.logoUrl.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium fuwari-text-75 mb-1.5 transition-colors">
                {m.friend_link_field_contact_email()}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                {...form.register("contactEmail")}
                type="email"
                className="w-full px-4 py-2.5 rounded-xl border border-(--fuwari-input-border) bg-(--fuwari-input-bg) focus:outline-none focus:ring-2 focus:ring-(--fuwari-primary)/50 focus:border-transparent transition-all"
                placeholder={m.friend_link_placeholder_contact_email_fuwari()}
              />
              {form.errors.contactEmail && (
                <p className="mt-1.5 text-sm text-red-500">
                  {form.errors.contactEmail.message}
                </p>
              )}
            </div>

            <div className="pt-2">
              <Turnstile {...form.turnstileProps} />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={form.isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold fuwari-btn-primary active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-(--fuwari-primary) disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {form.isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  m.friend_link_submit_form_title()
                )}
              </button>
            </div>
          </form>
        </div>

        {/* My Links Section */}
        <div
          className="lg:col-span-2 fuwari-card-base p-6 md:p-8 fuwari-onload-animation self-start"
          style={{ animationDelay: "450ms" }}
        >
          <h2 className="text-xl font-bold fuwari-text-90 mb-6 transition-colors">
            {m.friend_link_my_submissions()}
          </h2>

          <div className="space-y-4">
            {myLinks.length > 0 ? (
              myLinks.map((link) => (
                <div
                  key={link.id}
                  className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 transition-all hover:border-(--fuwari-primary)/30"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold fuwari-text-90 truncate transition-colors">
                      {link.siteName}
                    </h3>
                    <StatusBadge status={link.status} />
                  </div>
                  <a
                    href={link.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs fuwari-text-50 hover:text-(--fuwari-primary) transition-colors truncate block mb-3"
                  >
                    {link.siteUrl}
                  </a>

                  {link.status === "rejected" && link.rejectionReason && (
                    <div className="mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <p className="text-xs text-red-600 dark:text-red-400">
                        <span className="font-bold">
                          {m.friend_link_rejection_reason_fuwari()}
                        </span>
                        {link.rejectionReason}
                      </p>
                    </div>
                  )}

                  <div className="text-[10px] fuwari-text-30 text-right mt-2 transition-colors">
                    {m.friend_link_submitted_at()}{" "}
                    {new Date(link.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center fuwari-text-30 transition-colors">
                <p className="text-sm">{m.friend_link_no_submissions()}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
