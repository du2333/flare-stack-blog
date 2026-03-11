import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
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

export interface UseProfileFormOptions {
  user: { name: string; image?: string | null } | undefined;
}

export function useProfileForm(options: UseProfileFormOptions) {
  const { user } = options;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileSchema>({
    resolver: standardSchemaResolver(createProfileSchema(m)),
    values: {
      name: user?.name || "",
      image: user?.image || "",
    },
  });

  const onSubmit = async (data: ProfileSchema) => {
    const { error } = await authClient.updateUser({
      name: data.name,
      image: data.image,
    });
    if (error) {
      toast.error(m.profile_toast_update_failed(), {
        description:
          getProfileAuthErrorMessage(error, m) ?? m.auth_error_default_desc(),
      });
      return;
    }
    toast.success(m.profile_toast_profile_updated(), {
      description: m.profile_toast_name_changed({ name: data.name }),
    });
  };

  return {
    register,
    errors,
    handleSubmit: handleSubmit(onSubmit),
    isSubmitting,
  };
}

export type UseProfileFormReturn = ReturnType<typeof useProfileForm>;
