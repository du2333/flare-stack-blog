import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { TurnstileProps } from "@/components/common/turnstile";

export interface LoginSchema {
  email: string;
  password: string;
}

export interface LoginFormData {
  register: UseFormRegister<LoginSchema>;
  errors: FieldErrors<LoginSchema>;
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  loginStep: "IDLE" | "VERIFYING" | "SUCCESS";
  isSubmitting: boolean;
  isUnverifiedEmail: boolean;
  rootError: string | undefined;
  handleResendVerification: () => Promise<void>;
  turnstileProps: TurnstileProps;
  turnstilePending: boolean;
}

export interface SocialLoginData {
  isLoading: boolean;
  turnstilePending: boolean;
  handleGithubLogin: () => Promise<void>;
}

export interface LoginPageProps {
  isEmailConfigured: boolean;
  loginForm: LoginFormData;
  socialLogin: SocialLoginData;
  turnstileElement: React.ReactNode;
}
