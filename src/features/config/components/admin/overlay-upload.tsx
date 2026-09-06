import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRef } from "react";
import { type FieldPath, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import type { SystemConfig } from "@/features/config/config.schema";
import { orpcClient } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export function OverlayUpload({
  name,
  assetPath,
  accept,
  className,
  label,
}: {
  name: FieldPath<SystemConfig>;
  assetPath: string;
  accept: string;
  className?: string;
  label?: string;
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
          if (file) upload.mutate(file);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={upload.isPending}
        className={cn(
          "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-black/45 text-white text-xs font-medium backdrop-blur-sm disabled:opacity-60",
          className,
        )}
      >
        {upload.isPending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : null}
        {buttonText}
      </button>
    </>
  );
}
