import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "@/lib/auth/auth.client";
import { uploadAvatarFn } from "@/features/media/media.api";

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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
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

  const uploadAvatar = async (file: File) => {
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const result = await uploadAvatarFn({ data: formData });
      setValue("image", result.url);
      // 同步更新 authClient session
      await authClient.updateUser({ image: result.url });
      toast.success("头像已更新");
    } catch (err) {
      toast.error("头像上传失败", {
        description: err instanceof Error ? err.message : "请重试",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return {
    register,
    errors,
    handleSubmit: handleSubmit(onSubmit),
    isSubmitting,
    uploadAvatar,
    isUploadingAvatar,
  };
}

export type UseProfileFormReturn = ReturnType<typeof useProfileForm>;
