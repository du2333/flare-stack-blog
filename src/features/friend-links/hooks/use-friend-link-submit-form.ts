import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTurnstile } from "@/components/common/turnstile";
import { m } from "@/paraglide/messages";
import type { SubmitFriendLinkInput } from "../friend-links.schema";
import { createSubmitFriendLinkSchema } from "../friend-links.schema";
import { useFriendLinks } from "./use-friend-links";

export function useFriendLinkSubmitForm(
  initial?: SubmitFriendLinkInput,
  onSubmitted?: () => void,
) {
  const { submit, isSubmitting } = useFriendLinks();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    isPending: turnstilePending,
    reset: resetTurnstile,
    turnstileProps,
  } = useTurnstile("friend-link");
  const form = useForm<SubmitFriendLinkInput>({
    resolver: standardSchemaResolver(createSubmitFriendLinkSchema(m)),
    defaultValues: initial ?? {
      siteName: "",
      siteUrl: "",
      description: "",
      logoUrl: "",
    },
  });
  const handleSubmit = async (data: SubmitFriendLinkInput) => {
    setSubmitError(null);
    try {
      await submit(data);
      onSubmitted?.();
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? error.code
          : undefined;
      setSubmitError(
        code === "DUPLICATE_URL"
          ? m.friend_links_toast_submit_duplicate()
          : code === "INVALID_STATE" || code === "NOT_FOUND"
            ? m.friend_apply_conflict()
            : m.friend_apply_failed(),
      );
    } finally {
      resetTurnstile();
    }
  };
  return {
    register: form.register,
    errors: form.formState.errors,
    handleSubmit: form.handleSubmit(handleSubmit),
    isSubmitting: isSubmitting || form.formState.isSubmitting,
    turnstilePending,
    turnstileProps,
    submitError,
    logoUrl: form.watch("logoUrl") || "",
  };
}
