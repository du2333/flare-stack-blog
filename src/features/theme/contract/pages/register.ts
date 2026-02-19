import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { TurnstileProps } from "@/components/common/turnstile";

export interface RegisterSchema {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterFormData {
  register: UseFormRegister<RegisterSchema>;
  errors: FieldErrors<RegisterSchema>;
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  isSubmitting: boolean;
  isSuccess: boolean;
  turnstileProps: TurnstileProps;
  turnstilePending: boolean;
}

export interface RegisterPageProps {
  isEmailConfigured: boolean;
  registerForm: RegisterFormData;
  turnstileElement: React.ReactNode;
}
