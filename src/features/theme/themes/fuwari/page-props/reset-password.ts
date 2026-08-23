import type { FieldErrors, UseFormRegister } from "react-hook-form";

export interface ResetPasswordSchema {
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordFormData {
  register: UseFormRegister<ResetPasswordSchema>;
  errors: FieldErrors<ResetPasswordSchema>;
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  isSubmitting: boolean;
}

export interface ResetPasswordPageProps {
  resetPasswordForm: ResetPasswordFormData;
  token: string | undefined;
  error: string | undefined;
}
