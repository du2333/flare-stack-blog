import type { FieldErrors, UseFormRegister } from "react-hook-form";

export interface ProfileUserInfo {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
}

export interface ProfileSchema {
  name: string;
  image?: string;
}

export interface ProfileFormData {
  register: UseFormRegister<ProfileSchema>;
  errors: FieldErrors<ProfileSchema>;
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  isSubmitting: boolean;
}

export interface PasswordSchema {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordFormData {
  register: UseFormRegister<PasswordSchema>;
  errors: FieldErrors<PasswordSchema>;
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  isSubmitting: boolean;
}

export interface NotificationData {
  enabled: boolean | undefined;
  isLoading: boolean;
  isPending: boolean;
  toggle: () => void;
}

export interface ProfilePageProps {
  user: ProfileUserInfo;
  profileForm: ProfileFormData;
  passwordForm: PasswordFormData | null;
  notification: NotificationData;
  logout: () => Promise<void>;
}
