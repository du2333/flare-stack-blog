import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { SystemConfig } from "@/features/config/config.schema";
import {
  createSystemConfigFormSchema,
  DEFAULT_CONFIG,
} from "@/features/config/config.schema";
import { useSystemSetting } from "@/features/config/hooks/use-system-setting";
import { m } from "@/paraglide/messages";

export function useSystemConfigForm() {
  const { settings, saveSettings, isLoading } = useSystemSetting();
  const methods = useForm<SystemConfig>({
    resolver: zodResolver(createSystemConfigFormSchema(m)),
    defaultValues: DEFAULT_CONFIG,
  });
  const {
    reset,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = methods;

  useEffect(() => {
    if (settings) reset(settings);
  }, [settings, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      await saveSettings(data);
      reset(data);
      toast.success(m.settings_toast_save_success());
    } catch {
      toast.error(m.settings_toast_save_error());
    }
  });

  return {
    methods,
    isLoading,
    isSubmitting,
    isDirty,
    onSubmit,
  };
}
