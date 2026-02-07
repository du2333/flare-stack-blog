import { EmailLayout } from "./EmailLayout";

interface FriendLinkAdminNotificationEmailProps {
  siteName: string;
  siteUrl: string;
  description: string;
  submitterName: string;
  reviewUrl: string;
}

export const FriendLinkAdminNotificationEmail = ({
  siteName,
  siteUrl,
  description,
  submitterName,
  reviewUrl,
}: FriendLinkAdminNotificationEmailProps) => {
  return (
    <EmailLayout previewText={`${submitterName} 提交了友链申请：${siteName}`}>
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
        新友链申请
      </h1>
      <p style={{ fontSize: "14px", color: "#444", lineHeight: "1.6" }}>
        <strong>{submitterName}</strong> 提交了友链申请：
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
          <strong>站点名称：</strong>
          {siteName}
        </p>
        <p style={{ margin: "4px 0" }}>
          <strong>站点地址：</strong>
          <a href={siteUrl} style={{ color: "#1a1a1a" }}>
            {siteUrl}
          </a>
        </p>
        {description && (
          <p style={{ margin: "4px 0" }}>
            <strong>简介：</strong>
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
          前往审核
        </a>
      </div>
    </EmailLayout>
  );
};
