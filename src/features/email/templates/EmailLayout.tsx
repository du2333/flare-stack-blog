import type { ReactNode } from "react";
import { blogConfig } from "@/blog.config";
import type { Locale } from "@/lib/i18n";

interface EmailLayoutProps {
  children: ReactNode;
  locale?: Locale;
  previewText?: string;
}

export const EmailLayout = ({
  children,
  locale,
  previewText,
}: EmailLayoutProps) => {
  return (
    <div
      lang={locale}
      style={{
        backgroundColor: "#ffffff",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
        margin: "0",
        padding: "0",
        width: "100%",
      }}
    >
      {previewText && (
        <div
          style={{
            display: "none",
            maxHeight: "0px",
            overflow: "hidden",
          }}
        >
          {previewText}
        </div>
      )}
      <table
        align="center"
        border={0}
        cellPadding="0"
        cellSpacing="0"
        width="100%"
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          padding: "40px 20px",
        }}
      >
        <tr>
          <td>
            <header style={{ marginBottom: "40px", textAlign: "center" }}>
              <h2
                style={{
                  fontFamily: '"Playfair Display", "Georgia", serif',
                  fontSize: "24px",
                  fontWeight: "500",
                  margin: "0",
                  letterSpacing: "-0.01em",
                }}
              >
                {blogConfig.title}
              </h2>
            </header>

            <main>{children}</main>

            <footer
              style={{
                marginTop: "60px",
                paddingTop: "20px",
                borderTop: "1px solid #f0f0f0",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: "12px",
                  color: "#999",
                  margin: "0",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                &copy; {new Date().getFullYear()} {blogConfig.title}.
              </p>
            </footer>
          </td>
        </tr>
      </table>
    </div>
  );
};
