import { useId, type ReactNode } from "react";
import { AdminFormRow } from "@/components/admin/admin-page";

/** What a control needs to be named, described and flagged by its row. */
export interface SettingControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

/**
 * One setting of a settings page: its name and description on the left, the
 * control on the right (AdminFormRow). The control comes from `children` with
 * the props that tie it to its name, description and error; an error shows
 * under the control.
 */
export function SettingRow({
  label,
  description,
  error,
  children,
}: {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  children: (control: SettingControlProps) => ReactNode;
}) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const describedBy =
    [description != null && descriptionId, error && errorId]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <AdminFormRow
      label={label}
      htmlFor={id}
      description={
        description == null ? undefined : (
          <span id={descriptionId}>{description}</span>
        )
      }
    >
      <div className="setting-control">
        {children({
          id,
          "aria-describedby": describedBy,
          "aria-invalid": error ? true : undefined,
        })}
        {error ? (
          <p id={errorId} className="fuwari-form-field-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </AdminFormRow>
  );
}

/**
 * An on/off setting: the switch sits on the right of the row, level with its
 * name, also when the rows stack on a narrow screen.
 */
export function SwitchRow({
  label,
  description,
  children,
}: {
  label: ReactNode;
  description?: ReactNode;
  children: (control: SettingControlProps) => ReactNode;
}) {
  const id = useId();
  const descriptionId = `${id}-description`;
  return (
    <AdminFormRow
      label={label}
      htmlFor={id}
      description={
        description == null ? undefined : (
          <span id={descriptionId}>{description}</span>
        )
      }
    >
      <div className="setting-switch">
        {children({
          id,
          "aria-describedby": description == null ? undefined : descriptionId,
        })}
      </div>
    </AdminFormRow>
  );
}

/** A labelled part of a multi-part setting, such as one SMTP field. */
export function SettingPart({
  label,
  error,
  children,
}: {
  label: ReactNode;
  error?: ReactNode;
  children: (control: SettingControlProps) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="setting-part">
      <label htmlFor={id} className="setting-part-label">
        {label}
      </label>
      {children({
        id,
        "aria-describedby": error ? errorId : undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {error ? (
        <p id={errorId} className="fuwari-form-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
