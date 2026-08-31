import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { ClientOnly } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, type InputHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import type {
  CreateFriendLinkInput,
  FriendLinkWithUser,
} from "@/features/friend-links/friend-links.schema";
import { createCreateFriendLinkSchema } from "@/features/friend-links/friend-links.schema";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const emptyValues: CreateFriendLinkInput = {
  siteName: "",
  siteUrl: "",
  description: "",
  logoUrl: "",
  contactEmail: "",
};

function valuesFrom(link: FriendLinkWithUser): CreateFriendLinkInput {
  return {
    siteName: link.siteName,
    siteUrl: link.siteUrl,
    description: link.description || "",
    logoUrl: link.logoUrl || "",
    contactEmail: link.contactEmail || "",
  };
}

interface FriendLinkFormDialogProps {
  open: boolean;
  link: FriendLinkWithUser | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFriendLinkInput) => void;
}

function FriendLinkFormDialogInternal({
  open,
  link,
  isSaving,
  onClose,
  onSubmit,
}: FriendLinkFormDialogProps) {
  const form = useForm<CreateFriendLinkInput>({
    resolver: standardSchemaResolver(createCreateFriendLinkSchema(m)),
    defaultValues: emptyValues,
  });
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = form;
  const [siteName, siteUrl] = watch(["siteName", "siteUrl"]);

  useEffect(() => {
    if (!open) return;
    reset(link ? valuesFrom(link) : emptyValues);
  }, [open, link, reset]);

  useEffect(() => {
    if (!open || isSaving) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isSaving, onClose]);

  const editing = link !== null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-100 flex items-center justify-center p-4 transition-opacity duration-200",
        open
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none",
      )}
    >
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
        onClick={isSaving ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="friend-link-form-title"
        className={cn(
          "relative w-full max-w-[440px] fuwari-card-base p-6 transition-all duration-200",
          open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        )}
      >
        <h2
          id="friend-link-form-title"
          className="text-lg font-medium fuwari-text-90"
        >
          {editing
            ? m.friend_links_edit_modal_title()
            : m.friend_links_add_modal_title()}
        </h2>
        <form
          className="mt-5 space-y-3"
          onSubmit={handleSubmit((data) =>
            onSubmit({
              siteName: data.siteName,
              siteUrl: data.siteUrl,
              description: data.description || undefined,
              logoUrl: data.logoUrl || undefined,
              contactEmail: data.contactEmail || undefined,
            }),
          )}
        >
          <Field
            label={m.friend_links_field_name()}
            error={errors.siteName?.message}
            inputProps={register("siteName")}
            placeholder={m.friend_links_form_site_name_ph()}
          />
          <Field
            label={m.friend_links_field_url()}
            error={errors.siteUrl?.message}
            inputProps={register("siteUrl")}
            placeholder={m.friend_links_form_site_url_ph()}
          />
          <Field
            label={m.friend_links_field_desc()}
            error={errors.description?.message}
            inputProps={register("description")}
            placeholder={m.friend_links_form_desc_ph()}
          />
          <Field
            label={m.friend_links_field_logo()}
            error={errors.logoUrl?.message}
            inputProps={register("logoUrl")}
            placeholder={m.friend_links_form_logo_ph()}
          />
          <Field
            label={m.friend_links_field_email()}
            error={errors.contactEmail?.message}
            inputProps={register("contactEmail")}
            placeholder={m.friend_links_form_email_ph()}
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="fuwari-btn-regular rounded-xl h-10 px-4 text-sm font-medium disabled:opacity-50"
            >
              {m.common_cancel()}
            </button>
            <button
              type="submit"
              disabled={isSaving || !siteName.trim() || !siteUrl.trim()}
              className="fuwari-btn-primary rounded-xl h-10 px-4 text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
              {editing
                ? m.friend_links_edit_modal_save()
                : m.friend_links_add_modal_submit()}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export function FriendLinkFormDialog(props: FriendLinkFormDialogProps) {
  return (
    <ClientOnly>
      <FriendLinkFormDialogInternal {...props} />
    </ClientOnly>
  );
}

function Field({
  label,
  error,
  placeholder,
  inputProps,
}: {
  label: string;
  error?: string;
  placeholder?: string;
  inputProps: InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <label className="grid gap-1.5 text-sm fuwari-text-50">
      {label}
      <input
        {...inputProps}
        placeholder={placeholder}
        className="h-10 px-3 rounded-xl bg-(--fuwari-btn-regular-bg) text-sm fuwari-text-90 outline-none"
      />
      {error ? (
        <span className="text-xs text-(--fuwari-danger-fg)">{error}</span>
      ) : null}
    </label>
  );
}
