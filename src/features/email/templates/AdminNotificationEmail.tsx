import type { Locale } from "@/lib/i18n";
import { m } from "@/paraglide/messages";
import { EmailLayout } from "./EmailLayout";

interface AdminNotificationEmailProps {
  commentPreview: string;
  commentUrl: string;
  commenterName: string;
  locale: Locale;
  mode: "new" | "pending";
  postTitle: string;
}

export const AdminNotificationEmail = ({
  commentPreview,
  commentUrl,
  commenterName,
  locale,
  mode,
  postTitle,
}: AdminNotificationEmailProps) => {
  const isPending = mode === "pending";

  return (
    <EmailLayout
      locale={locale}
      previewText={
        isPending
          ? m.email_comment_admin_pending_preview(
              { commenterName, postTitle },
              { locale },
            )
          : m.email_comment_admin_root_preview(
              { commenterName, postTitle },
              { locale },
            )
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
        {isPending
          ? m.email_comment_admin_pending_title({}, { locale })
          : m.email_comment_admin_root_title({}, { locale })}
      </h1>
      <p style={{ fontSize: "14px", color: "#444", lineHeight: "1.6" }}>
        {isPending
          ? m.email_comment_admin_pending_intro(
              { commenterName, postTitle },
              { locale },
            )
          : m.email_comment_admin_root_intro(
              { commenterName, postTitle },
              { locale },
            )}
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
        {commentPreview}
      </blockquote>
      <div style={{ marginTop: "32px" }}>
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
          {isPending
            ? m.email_comment_admin_pending_action({}, { locale })
            : m.email_comment_admin_root_action({}, { locale })}
        </a>
      </div>
    </EmailLayout>
  );
};
