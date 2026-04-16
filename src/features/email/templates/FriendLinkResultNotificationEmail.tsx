import type { Locale } from "@/lib/i18n";
import { m } from "@/paraglide/messages";
import { EmailLayout } from "./EmailLayout";

interface FriendLinkResultNotificationEmailProps {
  approved: boolean;
  blogUrl?: string;
  locale: Locale;
  rejectionReason?: string;
  siteName: string;
}

export const FriendLinkResultNotificationEmail = ({
  approved,
  blogUrl,
  locale,
  rejectionReason,
  siteName,
}: FriendLinkResultNotificationEmailProps) => {
  return (
    <EmailLayout
      locale={locale}
      previewText={
        approved
          ? m.email_friend_link_approved_preview({ siteName }, { locale })
          : m.email_friend_link_rejected_preview({ siteName }, { locale })
      }
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
        {m.email_friend_link_result_title({}, { locale })}
      </h1>
      {approved ? (
        <>
          <p style={{ fontSize: "14px", color: "#444", lineHeight: "1.6" }}>
            {m.email_friend_link_approved_body({ siteName }, { locale })}
          </p>
          {blogUrl && (
            <div style={{ marginTop: "32px" }}>
              <a
                href={blogUrl}
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
                {m.email_friend_link_approved_action({}, { locale })}
              </a>
            </div>
          )}
        </>
      ) : (
        <>
          <p style={{ fontSize: "14px", color: "#444", lineHeight: "1.6" }}>
            {m.email_friend_link_rejected_body({ siteName }, { locale })}
          </p>
          {rejectionReason && (
            <blockquote
              style={{
                borderLeft: "2px solid #e5e5e5",
                margin: "24px 0",
                paddingLeft: "16px",
                fontStyle: "italic",
                color: "#666",
                fontSize: "14px",
                lineHeight: "1.6",
              }}
            >
              {rejectionReason}
            </blockquote>
          )}
          <p
            style={{
              fontSize: "13px",
              color: "#999",
              lineHeight: "1.6",
              marginTop: "24px",
            }}
          >
            {m.email_friend_link_rejected_followup({}, { locale })}
          </p>
        </>
      )}
    </EmailLayout>
  );
};
