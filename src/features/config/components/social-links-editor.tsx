import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { AssetUploadField } from "@/features/config/components/asset-upload-field";
import type { SystemConfig } from "@/features/config/config.schema";
import {
  SOCIAL_PLATFORM_KEYS,
  SOCIAL_PLATFORMS,
} from "@/features/config/utils/social-platforms";
import { m } from "@/paraglide/messages";

export function SocialLinksEditor() {
  const { register, control, watch } = useFormContext<SystemConfig>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "site.social",
  });

  return (
    <div className="space-y-3">
      {fields.map((field, index) => {
        const platform = watch(`site.social.${index}.platform`);
        return (
          <div
            key={field.id}
            className="flex flex-col gap-3 p-4 border border-border/30 rounded-lg bg-background/30"
          >
            <div className="flex items-start gap-2 sm:gap-3">
              <select
                {...register(`site.social.${index}.platform`)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shrink-0 min-w-25 sm:min-w-30"
              >
                {SOCIAL_PLATFORM_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key === "custom"
                      ? m.settings_social_custom()
                      : SOCIAL_PLATFORMS[key].label}
                  </option>
                ))}
              </select>

              <div className="flex-1 min-w-0">
                <Input
                  {...register(`site.social.${index}.url`)}
                  placeholder={m.settings_social_url_ph()}
                />
              </div>

              <button
                type="button"
                onClick={() => remove(index)}
                className="h-9 w-9 flex items-center justify-center shrink-0 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-muted/50"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {platform === "custom" && (
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/10">
                <div className="w-full sm:w-48 shrink-0">
                  {/* Invisible spacer to match AssetUploadField's label height on desktop */}
                  <div
                    className="hidden sm:flex space-y-1 min-h-10 flex-col justify-end"
                    aria-hidden="true"
                  >
                    <p className="text-sm font-medium opacity-0 select-none">
                      Spacer
                    </p>
                    <div className="h-4" />
                  </div>
                  <Input
                    {...register(`site.social.${index}.label`)}
                    placeholder={m.settings_social_label_ph()}
                  />
                </div>
                <div className="w-full sm:flex-1 shrink-0 min-w-0">
                  <AssetUploadField
                    name={`site.social.${index}.icon`}
                    assetPath={`social/custom-${index}`}
                    accept=".svg,.png,.webp"
                    label={m.settings_social_icon()}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => append({ platform: "github", url: "" })}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus size={16} />
        {m.settings_social_add()}
      </button>
    </div>
  );
}
