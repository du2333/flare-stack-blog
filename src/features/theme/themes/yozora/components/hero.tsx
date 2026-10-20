import { Link, useRouteContext } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";

/**
 * 首页 Hero：纸与光（对齐 proto-v9）。
 * 全屏背景（白大褂 + 灯塔）+ 偏心大衬线标题 + 背影 + 贴上去的照片卡。
 * 文案来自站点配置（title/description），可在后台改，不写死。
 */
export function Hero() {
  const { siteConfig } = useRouteContext({ from: "__root__" });

  return (
    <section className="yz-hero">
      {/* 背景层 */}
      <div className="yz-hero__bg" aria-hidden="true">
        <img src="/images/yozora/hero.jpg" alt="" fetchPriority="high" />
      </div>

      {/* 背影（仅亮色、桌面） */}
      <div className="yz-hero__chara" aria-hidden="true">
        <img src="/images/yozora/chara.jpg" alt="" loading="lazy" />
      </div>

      <div className="yz-hero__inner">
        <div className="yz-hero__copy">
          <div className="yz-hero__pagemark">
            <svg width="34" height="10" viewBox="0 0 34 10" fill="none" aria-hidden="true">
              <path d="M1 5h12" stroke="currentColor" strokeWidth=".8" />
              <path
                d="M18 1.6c3.2 0 3.2 6.8 6.4 6.8s3.2-6.8 6.4-6.8"
                stroke="var(--yz-gold)"
                strokeWidth=".8"
                fill="none"
              />
            </svg>
            <span>
              Paper &amp; Light · <i className="yz-hero__jp">半透明の魔法使</i>
            </span>
          </div>

          <h1 className="yz-hero__title">{siteConfig.title}</h1>

          <p className="yz-hero__lead">{siteConfig.description}</p>

          <div className="yz-hero__act">
            <Link to="/posts" className="yz-hero__solid">
              {m.home_view_all_posts()}
            </Link>
            <Link to="/friend-links" className="yz-hero__line">
              {m.nav_friend_links()}
            </Link>
          </div>
        </div>

        <figure className="yz-hero__photo">
          <img src="/images/yozora/still.jpg" alt="" loading="lazy" />
          <figcaption>no.04 — ribbon &amp; coffee</figcaption>
        </figure>
      </div>
    </section>
  );
}
