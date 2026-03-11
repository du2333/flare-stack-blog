import { Loader2 } from "lucide-react";
import { Turnstile } from "@/components/common/turnstile";
import { Input } from "@/components/ui/input";
import type { FriendLinkSubmitFormData } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";

interface FriendLinkSubmitFormProps {
  form: FriendLinkSubmitFormData;
}

export function FriendLinkSubmitForm({ form }: FriendLinkSubmitFormProps) {
  const { register, errors, handleSubmit, isSubmitting, turnstileProps } = form;

  const inputClassName =
    "bg-transparent border-0 border-b border-border text-foreground font-serif text-lg px-0 rounded-none focus-visible:ring-0 focus-visible:border-foreground transition-all placeholder:text-muted-foreground/30 shadow-none h-auto py-2";
  const monoInputClassName =
    "bg-transparent border-0 border-b border-border text-foreground font-mono text-sm px-0 rounded-none focus-visible:ring-0 focus-visible:border-foreground transition-all placeholder:text-muted-foreground/30 shadow-none h-auto py-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Turnstile {...turnstileProps} />
      <div className="space-y-6">
        <div className="space-y-2 group">
          <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider group-focus-within:text-foreground transition-colors">
            {m.friend_link_field_site_name()} *
          </label>
          <Input
            {...register("siteName")}
            className={inputClassName}
            placeholder={m.friend_link_placeholder_site_name_default()}
          />
          {errors.siteName && (
            <span className="text-[10px] text-destructive font-mono">
              {errors.siteName.message}
            </span>
          )}
        </div>

        <div className="space-y-2 group">
          <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider group-focus-within:text-foreground transition-colors">
            {m.friend_link_field_site_url()} *
          </label>
          <Input
            {...register("siteUrl")}
            className={monoInputClassName}
            placeholder={m.friend_link_placeholder_site_url()}
          />
          {errors.siteUrl && (
            <span className="text-[10px] text-destructive font-mono">
              {errors.siteUrl.message}
            </span>
          )}
        </div>

        <div className="space-y-2 group">
          <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider group-focus-within:text-foreground transition-colors">
            {m.friend_link_field_description_default()}
          </label>
          <Input
            {...register("description")}
            className={inputClassName}
            placeholder={m.friend_link_placeholder_description_default()}
          />
          {errors.description && (
            <span className="text-[10px] text-destructive font-mono">
              {errors.description.message}
            </span>
          )}
        </div>

        <div className="space-y-2 group">
          <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider group-focus-within:text-foreground transition-colors">
            {m.friend_link_field_logo_url_default()}
          </label>
          <Input
            {...register("logoUrl")}
            className={monoInputClassName}
            placeholder={m.friend_link_placeholder_site_url()}
          />
          {errors.logoUrl && (
            <span className="text-[10px] text-destructive font-mono">
              {errors.logoUrl.message}
            </span>
          )}
        </div>

        <div className="space-y-2 group">
          <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider group-focus-within:text-foreground transition-colors">
            {m.friend_link_field_contact_email()} *
          </label>
          <Input
            {...register("contactEmail")}
            className={monoInputClassName}
            placeholder={m.friend_link_placeholder_contact_email_default()}
          />
          {errors.contactEmail && (
            <span className="text-[10px] text-destructive font-mono">
              {errors.contactEmail.message}
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-start">
        <button
          type="submit"
          disabled={isSubmitting}
          className="font-mono text-xs text-muted-foreground hover:text-foreground hover:bg-transparent p-0 h-auto transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" />{" "}
              {m.friend_link_submitting()}
            </span>
          ) : (
            m.friend_link_submit_button_default()
          )}
        </button>
      </div>
    </form>
  );
}
