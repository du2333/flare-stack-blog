import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { type FieldPath, useFormContext } from "react-hook-form";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  SITE_ASSET_MAX_FILE_SIZE,
  SITE_ASSET_MAX_FILE_SIZE_MB,
} from "@/features/config/config.asset.schema";
import type { SystemConfig } from "@/features/config/config.schema";
import { orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

export function OverlayUpload({
  name,
  assetPath,
  accept,
  className,
  label,
  variant = "overlay",
}: {
  name: FieldPath<SystemConfig>;
  assetPath: string;
  accept: string;
  className?: string;
  label?: string;
  /** `regular` or `outline` where the button does not sit on an image. */
  variant?: "overlay" | "regular" | "outline";
}) {
  const { setValue, watch } = useFormContext<SystemConfig>();
  const inputRef = useRef<HTMLInputElement>(null);
  const currentValue = watch(name);
  const upload = useMutation({
    mutationFn: (file: File) =>
      orpcClient.config.admin.uploadAsset({ file, assetPath }),
    onSuccess: (result) => {
      setValue(name, result.url, { shouldDirty: true, shouldValidate: true });
      toast.success(m.settings_asset_upload_success());
    },
    onError: (error) => {
      toast.error(m.settings_asset_upload_fail(), {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });

  const buttonText = upload.isPending
    ? m.settings_asset_uploading()
    : label
      ? label
      : currentValue
        ? m.settings_replace()
        : m.settings_asset_upload_btn();

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          if (file.size > SITE_ASSET_MAX_FILE_SIZE) {
            toast.error(m.settings_asset_upload_fail(), {
              description: m.settings_asset_validation_file_too_large({
                maxSizeMb: SITE_ASSET_MAX_FILE_SIZE_MB,
              }),
            });
            return;
          }
          upload.mutate(file);
        }}
      />
      <Button
        variant={variant}
        size="sm"
        onClick={() => inputRef.current?.click()}
        loading={upload.isPending}
        className={className}
      >
        {buttonText}
      </Button>
    </>
  );
}
