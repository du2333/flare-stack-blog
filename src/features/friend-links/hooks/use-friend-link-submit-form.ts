import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";
import { useTurnstile } from "@/components/common/turnstile";
import { m } from "@/paraglide/messages";
import type { SubmitFriendLinkInput } from "../friend-links.schema";
import { createSubmitFriendLinkSchema } from "../friend-links.schema";
import { useFriendLinks } from "./use-friend-links";

export function useFriendLinkSubmitForm(defaultEmail?: string) {
  const { submit, isSubmitting } = useFriendLinks();
  const {
    isPending: turnstilePending,
    reset: resetTurnstile,
    turnstileProps,
  } = useTurnstile("friend-link");

  const form = useForm<SubmitFriendLinkInput>({
    resolver: standardSchemaResolver(createSubmitFriendLinkSchema(m)),
    defaultValues: {
      contactEmail: defaultEmail || "",
    },
  });

  const handleSubmit = async (data: SubmitFriendLinkInput) => {
    try {
      await submit({ data });
      form.reset({ contactEmail: defaultEmail || "" });
    } catch {
      // Error toast is handled by mutation onSuccess branch / global onError
      // Keep form state intact on error
    } finally {
      resetTurnstile();
    }
  };

  return {
    register: form.register,
    errors: form.formState.errors,
    handleSubmit: form.handleSubmit(handleSubmit),
    isSubmitting: isSubmitting || turnstilePending,
    turnstileProps,
  };
}

export type UseFriendLinkSubmitFormReturn = ReturnType<
  typeof useFriendLinkSubmitForm
>;
