import type {
  FriendLinkWithUser,
  SubmitFriendLinkInput,
} from "@/features/friend-links/friend-links.schema";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { TurnstileProps } from "@/components/common/turnstile";

export interface FriendLinksPageProps {
  links: Array<Omit<FriendLinkWithUser, "createdAt" | "updatedAt">>;
}

export interface MyFriendLink {
  id: number;
  siteName: string;
  siteUrl: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  createdAt: Date | string;
}

export interface FriendLinkSubmitFormData {
  register: UseFormRegister<SubmitFriendLinkInput>;
  errors: FieldErrors<SubmitFriendLinkInput>;
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  isSubmitting: boolean;
  turnstileProps: TurnstileProps;
}

export interface SubmitFriendLinkPageProps {
  myLinks: Array<MyFriendLink>;
  form: FriendLinkSubmitFormData;
}
