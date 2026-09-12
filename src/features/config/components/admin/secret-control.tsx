import { SettingsDisclosure } from "./settings-disclosure";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import type { ConfigFormValues } from "./config-editing";
import { SETTINGS_FIELD_CLASS } from "./settings-pages";
import { m } from "@/paraglide/messages";

export function SecretControl({
  kind,
  stored,
  label,
}: {
  kind: "email" | "webhook";
  stored: boolean;
  label: string;
}) {
  const { watch, setValue } = useFormContext<ConfigFormValues>();
  const name =
    kind === "email" ? "email.password" : "notification.webhook.secret";
  const clearName =
    kind === "email" ? "clearEmailPassword" : "clearWebhookSecret";
  const value = watch(name) ?? "";
  const cleared = watch(clearName);
  const [editing, setEditing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);
  useEffect(() => {
    if (!value && !cleared) {
      setEditing(false);
      setVisible(false);
    }
  }, [value, cleared]);
  const showInput = !stored || editing || !!value;
  return (
    <div className="settings-secret">
      {cleared ? (
        <p>{m.settings_design_secret_removed()}</p>
      ) : showInput ? (
        <div className="settings-secret-input">
          <input
            ref={inputRef}
            aria-label={label}
            value={value}
            autoComplete="new-password"
            type={visible ? "text" : "password"}
            onChange={(event) =>
              setValue(name, event.target.value, { shouldDirty: true })
            }
            className={SETTINGS_FIELD_CLASS}
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={
              visible
                ? m.settings_design_hide_secret()
                : m.settings_design_show_secret()
            }
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      ) : (
        <div className="settings-secret-summary">
          <span>{m.settings_design_secret_configured()}</span>
          <button
            ref={triggerRef}
            type="button"
            className="settings-text-action"
            onClick={() => setEditing(true)}
          >
            {m.settings_design_replace_secret()}
          </button>
        </div>
      )}
      {cleared && (
        <button
          type="button"
          className="settings-text-action"
          onClick={() => {
            setValue(clearName, false, { shouldDirty: true });
            setEditing(true);
          }}
        >
          {m.settings_design_replace_secret()}
        </button>
      )}
      {kind === "webhook" && !cleared && showInput && (
        <button
          type="button"
          className="settings-text-action"
          onClick={() =>
            setValue(name, crypto.randomUUID(), { shouldDirty: true })
          }
        >
          {m.settings_config_secret_generate()}
        </button>
      )}
      {stored && !cleared && (
        <SettingsDisclosure
          className="settings-secret-more"
          title={m.settings_design_credential_actions()}
        >
          <button
            type="button"
            className="settings-text-action"
            onClick={() => setRemoving(true)}
          >
            {m.settings_design_remove_secret()}
          </button>
        </SettingsDisclosure>
      )}
      <ConfirmationModal
        isOpen={removing}
        onClose={() => setRemoving(false)}
        onConfirm={() => {
          setValue(name, "", { shouldDirty: true });
          setValue(clearName, true, { shouldDirty: true });
          if (kind === "webhook")
            setValue("notification.webhook.url", "", { shouldDirty: true });
          setRemoving(false);
          setEditing(false);
        }}
        title={m.settings_design_remove_secret()}
        message={
          kind === "email"
            ? m.settings_design_remove_email_hint()
            : m.settings_design_remove_webhook_hint()
        }
        confirmLabel={m.settings_design_remove_secret()}
        isDanger
        fallbackFocus={() => triggerRef.current}
      />
    </div>
  );
}
