import { Eye, Palette } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { buttonClass } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { SystemConfig } from "@/features/config/config.schema";
import type { ThemeId } from "@/features/config/site-config.schema";
import {
  resolveThemeOptions,
  selectTheme,
  THEMES,
  type Theme,
} from "@/features/theme/themes";
import { themePreviewHref } from "@/features/theme/utils/theme-preview-params";
import { m } from "@/paraglide/messages";

type OptionField = NonNullable<Theme["optionFields"]>[number];

/**
 * Every registered Theme as a card, the selected one's own options under it.
 * Choosing marks the form unsaved like any other field; the options of the
 * Themes not chosen stay in the form, so switching back finds them.
 */
export function ThemePicker({
  themes = THEMES,
}: {
  themes?: ReadonlyArray<Theme>;
}) {
  const { control, setValue } = useFormContext<SystemConfig>();
  const themeId = useWatch({ control, name: "site.theme.id" });
  const options = useWatch({ control, name: "site.theme.options" });
  const selected = selectTheme(themeId ?? "", themes);

  return (
    <>
      <section className="site-theme-row">
        <div className="site-section-copy">
          <strong id="site-theme-label">{m.settings_theme()}</strong>
          <p id="site-theme-hint">{m.settings_theme_hint()}</p>
        </div>
        <ChoiceCards
          aria-labelledby="site-theme-label"
          aria-describedby="site-theme-hint"
          value={selected.id}
          onValueChange={(next) =>
            setValue("site.theme.id", next as ThemeId, { shouldDirty: true })
          }
          items={themes.map((theme) => {
            const Thumbnail = theme.thumbnail;
            const name = theme.name();
            return {
              value: theme.id,
              label: name,
              media: Thumbnail ? (
                <Thumbnail />
              ) : (
                <Palette size={26} strokeWidth={1.5} />
              ),
              // Opens the home page in a new tab, so the draft stays here.
              action: (
                <a
                  className={buttonClass({ variant: "text", size: "sm" })}
                  href={themePreviewHref(
                    theme.id,
                    resolveThemeOptions(theme, options?.[theme.id]),
                  )}
                  target="_blank"
                  rel="noopener"
                  aria-label={m.settings_theme_preview_label({ name })}
                >
                  <Eye size={14} aria-hidden="true" />
                  {m.settings_theme_preview()}
                </a>
              ),
            };
          })}
        />
      </section>
      {selected.optionFields?.map((field) => (
        <ThemeOptionRow
          key={`${selected.id}.${field.key}`}
          theme={selected}
          field={field}
        />
      ))}
    </>
  );
}

function ThemeOptionRow({
  theme,
  field,
}: {
  theme: Theme;
  field: OptionField;
}) {
  const { control, setValue } = useFormContext<SystemConfig>();
  const stored = useWatch({
    control,
    name: `site.theme.options.${theme.id}`,
  });
  const value = String(resolveThemeOptions(theme, stored)[field.key] ?? "");
  const id = `site-theme-option-${theme.id}-${field.key}`;

  return (
    <section className="site-theme-row">
      <div className="site-section-copy">
        <strong id={`${id}-label`}>{field.label()}</strong>
        {field.hint ? <p id={`${id}-hint`}>{field.hint()}</p> : null}
      </div>
      <div className="site-theme-option-control">
        <SegmentedControl
          className="site-theme-option-choice"
          size="sm"
          aria-labelledby={`${id}-label`}
          aria-describedby={field.hint ? `${id}-hint` : undefined}
          items={field.choices.map((choice) => ({
            value: choice.value,
            label: choice.label(),
          }))}
          value={value}
          onValueChange={(next) =>
            setValue(`site.theme.options.${theme.id}.${field.key}`, next, {
              shouldDirty: true,
            })
          }
        />
      </div>
    </section>
  );
}
