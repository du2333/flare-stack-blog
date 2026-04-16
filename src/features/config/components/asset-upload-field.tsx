import { useMutation } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { useRef } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { uploadSiteAssetFn } from "@/features/config/api/config.api";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface AssetUploadFieldProps {
  name: string;
  assetPath: string;
  accept: string;
  label: string;
  hint?: string;
  placeholder?: string;
  readOnly?: boolean;
  error?: string;
}

function getPreviewUrl(value: string): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return null;
}

export function AssetUploadField({
  name,
  assetPath,
  accept,
  label,
  hint,
  placeholder,
  readOnly,
  error,
}: AssetUploadFieldProps) {
  const { register, setValue, watch } = useFormContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const value = watch(name);
  const previewUrl = getPreviewUrl(value);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("assetPath", assetPath);
      return uploadSiteAssetFn({ data: formData });
    },
    onSuccess: (result) => {
      setValue(name, result.url, { shouldDirty: true });
      toast.success(m.settings_asset_upload_success());
    },
    onError: (err) => {
      toast.error(m.settings_asset_upload_fail(), {
        description: err instanceof Error ? err.message : undefined,
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
    e.target.value = "";
  };

  const isUploading = uploadMutation.isPending;

  return (
    <label className="space-y-3">
      <div className="space-y-1 min-h-10 flex flex-col justify-end">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : (
          <div className="h-4" /> // Spacer for alignment
        )}
      </div>

      <div className="flex gap-3 items-start">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex gap-2">
            <Input
              {...register(name)}
              readOnly={readOnly}
              className={cn(
                error && "border-destructive focus-visible:border-destructive",
                readOnly && "border-dashed opacity-60 bg-muted/5",
              )}
              placeholder={placeholder ?? `/images/asset/${assetPath}`}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="shrink-0 flex items-center gap-2 px-3 py-1.5 text-xs font-mono uppercase tracking-widest border border-border/50 bg-background hover:bg-accent/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              <span>
                {isUploading
                  ? m.settings_asset_uploading()
                  : m.settings_asset_upload_btn()}
              </span>
            </button>
          </div>
          {previewUrl ? (
            <div className="w-12 h-12 rounded overflow-hidden border border-border/30 bg-muted/30">
              <img
                src={previewUrl}
                alt=""
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </label>
  );
}
