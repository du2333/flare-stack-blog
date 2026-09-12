import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { m } from "@/paraglide/messages";
import "./password-input.css";

/** Keep one theme-aware reveal control instead of mixing native and custom controls. */
export function PasswordInput(props: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="fuwari-password-input">
      <input {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        disabled={props.disabled}
        aria-label={visible ? m.login_hide_password() : m.login_show_password()}
        aria-pressed={visible}
        aria-controls={props.id}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? (
          <EyeOff size={18} aria-hidden="true" />
        ) : (
          <Eye size={18} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
