import { ClientOnly, useRouteContext } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";

/** 原主题来源与移植者信息(GPL 要求保留原作署名) */
const CUCKOO_SOURCE_URL = "https://github.com/bhaoo/Cuckoo";
const PORTER_URL = "https://github.com/SkyDream01";

/**
 * 页脚(对应原主题 footer):
 * 半透明整行卡片,版权 + 主题署名与移植标注。
 */
export function Footer() {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="mt-5 w-full"
      style={{ backgroundColor: "var(--cuckoo-footer-bg)" }}
    >
      <div
        className="mx-auto w-full max-w-(--cuckoo-page-width) px-4 py-4 text-center text-sm"
        style={{ color: "var(--cuckoo-footer-text)" }}
      >
        <p className="leading-6">
          <ClientOnly fallback="-">
            {m.footer_copyright({
              year: currentYear.toString(),
              author: siteConfig.author,
            })}
          </ClientOnly>
          <span className="mx-1">｜</span>
          <span>
            Theme{" "}
            <a
              href={CUCKOO_SOURCE_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-(--cuckoo-footer-text-hover)"
            >
              Cuckoo
            </a>{" "}
            by{" "}
            <a
              href="https://dwd.moe/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-(--cuckoo-footer-text-hover)"
            >
              Bhao
            </a>
          </span>
          <span className="mx-1">｜</span>
          <span>
            {m.footer_ported_by_cuckoo()}{" "}
            <a
              href={PORTER_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-(--cuckoo-footer-text-hover)"
            >
              Tensin
            </a>
          </span>
          <span className="mx-1">｜</span>
          <span>
            {m.footer_powered_by()}{" "}
            <a
              href="https://github.com/du2333/flare-stack-blog"
              target="_blank"
              rel="noreferrer"
              className="hover:text-(--cuckoo-footer-text-hover)"
            >
              Flare Stack Blog
            </a>
          </span>
        </p>
      </div>
    </footer>
  );
}
