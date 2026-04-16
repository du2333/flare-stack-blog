import type { Locale } from "@/lib/i18n";
import { m } from "@/paraglide/messages";
import { EmailLayout } from "./EmailLayout";

interface FriendLinkAdminNotificationEmailProps {
  description: string;
  locale: Locale;
  reviewUrl: string;
  siteName: string;
  siteUrl: string;
  submitterName: string;
}

export const FriendLinkAdminNotificationEmail = ({
  description,
  locale,
  reviewUrl,
  siteName,
  siteUrl,
  submitterName,
}: FriendLinkAdminNotificationEmailProps) => {
  return (
    <EmailLayout
      locale={locale}
      previewText={m.email_friend_link_submitted_preview(
        { submitterName, siteName },
        { locale },
      )}
    >
      <h1
        style={{
          fontFamily: '"Playfair Display", "Georgia", serif',
          fontSize: "20px",
          fontWeight: "500",
          color: "#1a1a1a",
          marginBottom: "24px",
          lineHeight: "1.4",
        }}
      >
        {m.email_friend_link_submitted_title({}, { locale })}
      </h1>
      <p style={{ fontSize: "14px", color: "#444", lineHeight: "1.6" }}>
        {m.email_friend_link_submitted_intro({ submitterName }, { locale })}
      </p>
      <div
        style={{
          borderLeft: "2px solid #e5e5e5",
          margin: "24px 0",
          paddingLeft: "16px",
          fontSize: "14px",
          color: "#666",
          lineHeight: "1.8",
        }}
      >
        <p style={{ margin: "4px 0" }}>
          <strong>
            {m.email_friend_link_submitted_site_name({}, { locale })}
          </strong>
          {siteName}
        </p>
        <p style={{ margin: "4px 0" }}>
          <strong>
            {m.email_friend_link_submitted_site_url({}, { locale })}
          </strong>
          <a href={siteUrl} style={{ color: "#1a1a1a" }}>
            {siteUrl}
          </a>
        </p>
        {description && (
          <p style={{ margin: "4px 0" }}>
            <strong>
              {m.email_friend_link_submitted_description({}, { locale })}
            </strong>
            {description}
          </p>
        )}
      </div>
      <div style={{ marginTop: "32px" }}>
        <a
          href={reviewUrl}
          style={{
            backgroundColor: "#1a1a1a",
            color: "#ffffff",
            padding: "12px 24px",
            textDecoration: "none",
            fontSize: "13px",
            display: "inline-block",
            letterSpacing: "0.05em",
          }}
        >
          {m.email_friend_link_submitted_action({}, { locale })}
        </a>
      </div>
    </EmailLayout>
  );
};
