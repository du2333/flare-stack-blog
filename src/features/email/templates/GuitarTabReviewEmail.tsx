import { EmailLayout } from "./EmailLayout";

interface GuitarTabReviewEmailProps {
  tabTitle: string;
  artist?: string;
  approved: boolean;
  rejectionReason?: string;
  blogUrl?: string;
}

export const GuitarTabReviewEmail = ({
  tabTitle,
  artist,
  approved,
  rejectionReason,
  blogUrl,
}: GuitarTabReviewEmailProps) => {
  const displayName = artist ? `${artist} - ${tabTitle}` : tabTitle;

  return (
    <EmailLayout
      previewText={`您投稿的吉他谱「${displayName}」${approved ? "已通过审核" : "未通过审核"}`}
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
        吉他谱审核结果
      </h1>
      {approved ? (
        <>
          <p style={{ fontSize: "14px", color: "#444", lineHeight: "1.6" }}>
            恭喜！您投稿的吉他谱 <strong>{displayName}</strong> 已通过审核，现已在吉他谱库中展示。
          </p>
          {blogUrl && (
            <div style={{ marginTop: "32px" }}>
              <a
                href={`${blogUrl}/guitar-tabs`}
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
                查看吉他谱库
              </a>
            </div>
          )}
        </>
      ) : (
        <>
          <p style={{ fontSize: "14px", color: "#444", lineHeight: "1.6" }}>
            很抱歉，您投稿的吉他谱 <strong>{displayName}</strong> 未通过审核。
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
            如有疑问，欢迎重新投稿。
          </p>
        </>
      )}
    </EmailLayout>
  );
};
