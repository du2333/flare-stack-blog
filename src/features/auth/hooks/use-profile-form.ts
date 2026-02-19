import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "@/lib/auth/auth.client";

const profileSchema = z.object({
  name: z.string().min(2, "昵称至少 2 位").max(20, "昵称最多 20 位"),
  image: z.union([z.literal(""), z.url("无效的 URL 地址").trim()]).optional(),
});

type ProfileSchema = z.infer<typeof profileSchema>;

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
    resolver: standardSchemaResolver(profileSchema),
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
      toast.error("更新失败", { description: error.message });
      return;
    }
    toast.success("资料已更新", { description: `昵称已更改为: ${data.name}` });
  };

  return {
    register,
    errors,
    handleSubmit: handleSubmit(onSubmit),
    isSubmitting,
  };
}

export type UseProfileFormReturn = ReturnType<typeof useProfileForm>;
