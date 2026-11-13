import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { createPublicNameSchema } from "@/features/auth/utils/public-name";
import { getAuthClient } from "@/lib/auth/auth-client";
import { getProfileAuthErrorMessage } from "@/lib/auth/auth-errors";
import { m } from "@/paraglide/messages";

const createProfileSchema = () =>
  z.object({
    name: createPublicNameSchema(),
    image: z
      .union([
        z.literal(""),
        z.string().url(m.profile_validation_avatar_invalid()).trim(),
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
    resolver: standardSchemaResolver(createProfileSchema()),
    defaultValues: { name: user?.name || "", image: user?.image || "" },
  });
  const {
    register,
    handleSubmit,
    reset,
    setValue,
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
      const { error } = await getAuthClient().updateUser({
        name: data.name,
        image: data.image || "",
      });
      if (error) {
        setFeedback({
          error: true,
          message:
            getProfileAuthErrorMessage(error) ?? m.auth_error_default_desc(),
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
    setImage: (image: string) =>
      setValue("image", image, { shouldDirty: true, shouldValidate: true }),
    feedback,
  };
}
