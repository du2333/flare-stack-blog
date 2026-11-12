import { LockKeyhole, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { IconButton } from "@/components/ui/icon-button";
import { PasswordInput } from "@/components/ui/password-input";
import type { ConfigFormValues } from "./config-editing";
import { m } from "@/paraglide/messages";

export function SecretControl({
  kind,
  stored,
  canGenerate = false,
  ...inputProps
}: {
  kind: "email" | "webhook";
  stored: boolean;
  /** Offers a random value, for a signing key the admin makes up. */
  canGenerate?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
  "aria-describedby"?: string;
}) {
  const { watch, setValue } = useFormContext<ConfigFormValues>();
  const name =
    kind === "email" ? "email.password" : "notification.webhook.secret";
  const clearName =
    kind === "email" ? "clearEmailPassword" : "clearWebhookSecret";
  const value = watch(name) ?? "";
  const cleared = watch(clearName);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);
  useEffect(() => {
    if (!value && !cleared) setEditing(false);
  }, [value, cleared]);
  const showInput = !stored || editing || !!value;
  // One entry for everything done to a saved credential.
  const actions: Array<ActionMenuItem> =
    stored && !cleared
      ? [
          ...(showInput
            ? []
            : [
                {
                  label: m.settings_design_replace_secret(),
                  onSelect: () => setEditing(true),
                },
              ]),
          {
            label: m.settings_design_remove_secret(),
            danger: true,
            onSelect: (trigger: HTMLButtonElement) => {
              triggerRef.current = trigger;
              setRemoving(true);
            },
          },
        ]
      : [];
  return (
    <div className="settings-secret">
      <div className="settings-secret-row">
        {cleared ? (
          <p className="settings-secret-summary">
            {m.settings_design_secret_removed()}
          </p>
        ) : showInput ? (
          <>
            <PasswordInput
              {...inputProps}
              ref={inputRef}
              secret
              value={value}
              onChange={(event) =>
                setValue(name, event.target.value, { shouldDirty: true })
              }
            />
            <ActionMenu
              label={m.settings_design_credential_actions()}
              items={actions}
            />
          </>
        ) : (
          // Set, and not shown: the two things to do with it are buttons
          // beside the field, not a menu inside it.
          <>
            <p className="settings-secret-summary">
              <LockKeyhole size={15} aria-hidden="true" />
              {m.settings_design_secret_configured()}
              <i aria-hidden="true">••••••••</i>
            </p>
            <Button variant="outline" onClick={() => setEditing(true)}>
              {m.settings_design_secret_change()}
            </Button>
            <IconButton
              ref={triggerRef}
              variant="quiet"
              size="md"
              tone="danger"
              label={m.settings_design_remove_secret()}
              onClick={() => setRemoving(true)}
            >
              <Trash2 size={16} />
            </IconButton>
          </>
        )}
      </div>
      {cleared && (
        <Button
          variant="text"
          size="sm"
          onClick={() => {
            setValue(clearName, false, { shouldDirty: true });
            setEditing(true);
          }}
        >
          {m.settings_design_replace_secret()}
        </Button>
      )}
      {canGenerate && !cleared && showInput && (
        <Button
          variant="text"
          size="sm"
          onClick={() =>
            setValue(name, crypto.randomUUID(), { shouldDirty: true })
          }
        >
          {m.settings_config_secret_generate()}
        </Button>
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
