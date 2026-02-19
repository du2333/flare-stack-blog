import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { TurnstileProps } from "@/components/common/turnstile";

export interface ForgotPasswordSchema {
  email: string;
}

export interface ForgotPasswordFormData {
  register: UseFormRegister<ForgotPasswordSchema>;
  errors: FieldErrors<ForgotPasswordSchema>;
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  isSubmitting: boolean;
  isSent: boolean;
  sentEmail: string;
  turnstileProps: TurnstileProps;
  turnstilePending: boolean;
}

export interface ForgotPasswordPageProps {
  forgotPasswordForm: ForgotPasswordFormData;
  turnstileElement: React.ReactNode;
}
