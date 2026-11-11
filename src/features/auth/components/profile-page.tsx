import { LogOut, UserRound } from "lucide-react";
import { lazy, Suspense, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ThemedPageHeading } from "@/features/theme/components/themed-page-heading";
import { Switch } from "@/components/ui/switch";
import type { useProfileForm } from "../hooks/use-profile-form";
import type { useNotificationToggle } from "../hooks/use-notification-toggle";
import { StatusText } from "@/components/ui/status-text";
import { m } from "@/paraglide/messages";
import "./profile-page.css";

// Only an Admin can pick an avatar from the media library, so readers never
// load the picker.
const MediaPicker = lazy(() =>
  import("@/features/media/components/media-library/components").then(
    (mod) => ({ default: mod.MediaPicker }),
  ),
);

interface ProfilePageProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role?: string | null;
  };
  profileForm: ReturnType<typeof useProfileForm>;
  notification: ReturnType<typeof useNotificationToggle>;
  logout: () => Promise<void>;
}

export function ProfilePage({
  user,
  profileForm,
  notification,
  logout,
}: ProfilePageProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const pickAvatarRef = useRef<HTMLButtonElement>(null);
  const image = profileForm.image;
  return (
    <section className="account-page fuwari-card-base fuwari-card-standalone">
      <ThemedPageHeading
        title={m.account_title()}
        back={{ to: "/", label: m.account_back() }}
        description={m.account_intro()}
      />
      <form
        className="account-profile"
        onSubmit={profileForm.handleSubmit}
        noValidate
      >
        <div className="account-avatar-preview">
          <div className="account-avatar">
            {/^https?:\/\//i.test(image) && image !== failedImage ? (
              <img src={image} alt="" onError={() => setFailedImage(image)} />
            ) : (
              <UserRound size={36} strokeWidth={1.5} />
            )}
          </div>
          <span>{m.account_avatar_preview()}</span>
        </div>
        <fieldset disabled={profileForm.isSubmitting}>
          <FormField
            label={m.profile_name()}
            error={profileForm.errors.name?.message}
            required
          >
            <Input
              {...profileForm.register("name")}
              autoComplete="nickname"
              maxLength={20}
            />
          </FormField>
          <FormField
            label={m.profile_avatar_url()}
            error={profileForm.errors.image?.message}
            action={
              user.role === "admin" && (
                <Button
                  ref={pickAvatarRef}
                  variant="text"
                  size="sm"
                  onClick={() => setPickingAvatar(true)}
                >
                  {m.account_avatar_pick_media()}
                </Button>
              )
            }
          >
            <Input
              {...profileForm.register("image")}
              type="url"
              placeholder="https://example.com/avatar.png"
            />
          </FormField>
          <div className="account-email">
            <span>{m.account_email()}</span>
            <p>{user.email}</p>
          </div>
          <div className="account-save">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!profileForm.isDirty}
              loading={profileForm.isSubmitting}
            >
              {m.account_save()}
            </Button>
            {profileForm.feedback &&
              (profileForm.feedback.error || !profileForm.isDirty) && (
                <StatusText error={profileForm.feedback.error}>
                  {profileForm.feedback.message}
                </StatusText>
              )}
          </div>
        </fieldset>
      </form>
      {pickingAvatar && (
        <Suspense fallback={null}>
          <MediaPicker
            open
            title={m.account_avatar_pick_media()}
            onClose={() => setPickingAvatar(false)}
            onSelect={(asset) => {
              profileForm.setImage(
                new URL(asset.url, window.location.origin).toString(),
              );
              setPickingAvatar(false);
            }}
            returnFocus={() => pickAvatarRef.current}
          />
        </Suspense>
      )}
      <section className="account-setting">
        <div className="account-setting-row">
          <div>
            <h2>{m.profile_email_notify()}</h2>
            <p>
              {notification.isError
                ? m.profile_notify_status_failed()
                : notification.isLoading
                  ? m.profile_notify_status_loading()
                  : !notification.available
                    ? m.profile_notify_unavailable()
                    : m.profile_email_notify_desc_fuwari()}
            </p>
          </div>
          {notification.isError ? (
            <Button variant="text" onClick={notification.reload}>
              {m.account_retry()}
            </Button>
          ) : (
            <Switch
              checked={notification.enabled === true}
              onCheckedChange={notification.toggle}
              aria-label={m.profile_email_notify()}
              loading={notification.isLoading || notification.isPending}
              disabled={
                !notification.available ||
                notification.isLoading ||
                notification.isPending ||
                notification.enabled === undefined
              }
            />
          )}
        </div>
      </section>
      <footer className="account-footer">
        <Button
          variant="plain"
          tone="danger"
          disabled={loggingOut}
          icon={<LogOut size={16} />}
          onClick={async () => {
            setLoggingOut(true);
            try {
              await logout();
            } finally {
              setLoggingOut(false);
            }
          }}
        >
          {m.profile_logout_fuwari()}
        </Button>
      </footer>
    </section>
  );
}
