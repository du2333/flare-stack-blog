import { useMutation } from "@tanstack/react-query";
import { type ReactNode, useRef } from "react";
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

type UploadVariant = "overlay" | "regular" | "outline";

export function OverlayUpload({
  name,
  assetPath,
  accept,
  className,
  label,
  describedBy,
  variant = "overlay",
}: {
  name: FieldPath<SystemConfig>;
  assetPath: string;
  accept: string;
  className?: string;
  label?: string;
  /** The id of what names the asset, where the button's text alone is ambiguous. */
  describedBy?: string;
  /** `regular` or `outline` where the button does not sit on an image. */
  variant?: UploadVariant;
}) {
  const { setValue, watch } = useFormContext<SystemConfig>();
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

  return (
    <AssetFileButton
      accept={accept}
      variant={variant}
      className={className}
      describedBy={describedBy}
      pending={upload.isPending}
      onFile={(file) => upload.mutate(file)}
    >
      {label ? label : currentValue ? m.settings_replace() : undefined}
    </AssetFileButton>
  );
}

/**
 * A button that opens the file picker and hands over the chosen file, once it
 * is within the site asset size limit. It reads 上传中 while `pending`, else its
 * children, else 上传.
 */
export function AssetFileButton({
  accept,
  variant = "outline",
  className,
  describedBy,
  pending,
  onFile,
  children,
}: {
  accept: string;
  variant?: UploadVariant;
  className?: string;
  describedBy?: string;
  pending: boolean;
  onFile: (file: File) => void;
  children?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
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
          onFile(file);
        }}
      />
      <Button
        variant={variant}
        size="sm"
        onClick={() => inputRef.current?.click()}
        loading={pending}
        className={className}
        aria-describedby={describedBy}
      >
        {pending
          ? m.settings_asset_uploading()
          : (children ?? m.settings_asset_upload_btn())}
      </Button>
    </>
  );
}
