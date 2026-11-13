import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { refreshSession } from "@/features/auth/queries";
import { createPublicNameSchema } from "@/features/auth/utils/public-name";
import { getAuthClient } from "@/lib/auth/auth-client";
import { getProfileAuthErrorMessage } from "@/lib/auth/auth-errors";
import { m } from "@/paraglide/messages";

const nameFormSchema = z.object({ name: createPublicNameSchema() });

type NameFormSchema = z.infer<typeof nameFormSchema>;

interface UsePublicNameFormOptions {
  onSaved?: () => void;
}

/** Asks a User who signed in without a name to choose the one others see. */
export function usePublicNameForm(options: UsePublicNameFormOptions = {}) {
  const { onSaved } = options;
  const queryClient = useQueryClient();

  const [saved, setSaved] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<NameFormSchema>({
    resolver: standardSchemaResolver(nameFormSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = async (data: NameFormSchema) => {
    setSubmitError(null);
    try {
      const { error } = await getAuthClient().updateUser({ name: data.name });
      if (error) {
        setSubmitError(
          getProfileAuthErrorMessage(error) ?? m.auth_error_default_desc(),
        );
        return;
      }
    } catch {
      setSubmitError(m.profile_toast_update_failed());
      return;
    }
    setSaved(true);
    // The name gate closes once the session carries the name.
    void refreshSession(queryClient);
    onSaved?.();
  };

  return {
    register: form.register,
    errors: form.formState.errors,
    handleSubmit: form.handleSubmit(onSubmit),
    isSubmitting: form.formState.isSubmitting,
    saved,
    submitError,
  };
}
