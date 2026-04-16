import type { Locale } from "@/lib/i18n";
import { m } from "@/paraglide/messages";
import { EmailLayout } from "./EmailLayout";

interface ReplyNotificationEmailProps {
  commentUrl: string;
  locale: Locale;
  postTitle: string;
  replierName: string;
  replyPreview: string;
  unsubscribeUrl: string;
}

export const ReplyNotificationEmail = ({
  commentUrl,
  locale,
  postTitle,
  replierName,
  replyPreview,
  unsubscribeUrl,
}: ReplyNotificationEmailProps) => {
  return (
    <EmailLayout
      locale={locale}
      previewText={m.email_comment_reply_preview(
        { replierName, postTitle },
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
        {m.email_comment_reply_title({}, { locale })}
      </h1>
      <p style={{ fontSize: "14px", color: "#444", lineHeight: "1.6" }}>
        {m.email_comment_reply_intro({ replierName }, { locale })}
      </p>
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
        {replyPreview}
      </blockquote>
      <div style={{ marginTop: "32px", marginBottom: "40px" }}>
        <a
          href={commentUrl}
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
          {m.email_comment_reply_action({}, { locale })}
        </a>
      </div>
      <div
        style={{
          paddingTop: "20px",
          borderTop: "1px solid #f9f9f9",
        }}
      >
        <p style={{ fontSize: "12px", color: "#999", margin: "0" }}>
          {m.email_comment_reply_unsubscribe_hint({}, { locale })}
          <a
            href={unsubscribeUrl}
            style={{
              color: "#999",
              textDecoration: "underline",
              marginLeft: "4px",
            }}
          >
            {m.email_comment_reply_unsubscribe_action({}, { locale })}
          </a>
        </p>
      </div>
    </EmailLayout>
  );
};
