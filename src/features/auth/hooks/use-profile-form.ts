import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "@/lib/auth/auth.client";
import { getProfileAuthErrorMessage } from "@/lib/auth/auth-errors";
import type { Messages } from "@/lib/i18n";
import { m } from "@/paraglide/messages";

const createProfileSchema = (messages: Messages) =>
  z.object({
    name: z
      .string()
      .min(2, messages.profile_validation_name_min())
      .max(20, messages.profile_validation_name_max()),
    image: z
      .union([
        z.literal(""),
        z.string().url(messages.profile_validation_avatar_invalid()).trim(),
      ])
      .optional(),
  });

type ProfileSchema = z.infer<ReturnType<typeof createProfileSchema>>;

interface UseProfileFormOptions {
  user: { name: string; image?: string | null } | undefined;
}

export function useProfileForm(options: UseProfileFormOptions) {
  const { user } = options;

  const [feedback, setFeedback] = useState<{
    error: boolean;
    message: string;
  } | null>(null);
  const form = useForm<ProfileSchema>({
    resolver: standardSchemaResolver(createProfileSchema(m)),
    defaultValues: { name: user?.name || "", image: user?.image || "" },
  });
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = form;
  useEffect(() => {
    if (!isDirty && !isSubmitting)
      reset({ name: user?.name || "", image: user?.image || "" });
    // Session refreshes must not overwrite a draft; only react to incoming profile changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.name, user?.image, reset]);

  const onSubmit = async (data: ProfileSchema) => {
    setFeedback(null);
    try {
      const { error } = await authClient.updateUser({
        name: data.name,
        image: data.image || "",
      });
      if (error) {
        setFeedback({
          error: true,
          message:
            getProfileAuthErrorMessage(error, m) ?? m.auth_error_default_desc(),
        });
        return;
      }
      reset(data);
      setFeedback({ error: false, message: m.profile_toast_profile_updated() });
      toast.success(m.profile_toast_profile_updated());
    } catch {
      setFeedback({ error: true, message: m.profile_toast_update_failed() });
    }
  };

  return {
    register,
    errors,
    handleSubmit: handleSubmit(onSubmit),
    isSubmitting,
    isDirty,
    image: watch("image") || "",
    feedback,
  };
}
