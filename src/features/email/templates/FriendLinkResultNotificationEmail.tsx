import { EmailLayout } from "./EmailLayout";

interface FriendLinkResultNotificationEmailProps {
  siteName: string;
  approved: boolean;
  rejectionReason?: string;
  blogUrl?: string;
}

export const FriendLinkResultNotificationEmail = ({
  siteName,
  approved,
  rejectionReason,
  blogUrl,
}: FriendLinkResultNotificationEmailProps) => {
  return (
    <EmailLayout
      previewText={`您的友链申请（${siteName}）${approved ? "已通过" : "未通过"}`}
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
        友链审核结果
      </h1>
      {approved ? (
        <>
          <p style={{ fontSize: "14px", color: "#444", lineHeight: "1.6" }}>
            恭喜！您的站点 <strong>{siteName}</strong> 的友链申请已通过审核。
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
                访问博客
              </a>
            </div>
          )}
        </>
      ) : (
        <>
          <p style={{ fontSize: "14px", color: "#444", lineHeight: "1.6" }}>
            很抱歉，您的站点 <strong>{siteName}</strong> 的友链申请未通过审核。
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
            如有疑问，欢迎重新提交申请。
          </p>
        </>
      )}
    </EmailLayout>
  );
};
