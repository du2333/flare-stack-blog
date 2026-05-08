# Flare Stack Blog — Google AdSense 优化路线图

## 目录

1. [当前状态评估](#1-当前状态评估)
2. [外部建议评审](#2-外部建议评审)
3. [总体策略](#3-总体策略)
4. [Phase 1：站点信任与合规](#phase-1站点信任与合规)
5. [Phase 2：SEO 架构升级](#phase-2seo-架构升级)
6. [Phase 3：性能与体验打磨](#phase-3性能与体验打磨)
7. [Phase 4：内容生产体系](#phase-4内容生产体系)
8. [Phase 5：持续增长与监测](#phase-5持续增长与监测)
9. [实施 TODO 总表](#9-实施-todo-总表)
10. [附录：AdSense 审核清单](#附录adsense-审核清单)

---

## 1. 当前状态评估

### 已有优势

| 维度 | 现状 | 评价 |
|------|------|------|
| SEO 基础 | canonical URL、Article JSON-LD、OG 标签、sitemap.xml、robots.txt、RSS/Atom/JSON Feed | 骨架完整 |
| 缓存性能 | CDN（s-maxage 1年）+ KV 版本化缓存 + SWR + Cache API 中间件 | 架构优秀 |
| 内容能力 | TipTap 富文本 + Shiki 代码高亮 + 版本历史 + Markdown 导入导出 | 内容生产基础好 |
| 互动系统 | 评论（嵌套回复、AI 审核、邮件通知）、友情链接 | 互动闭环完整 |
| 数据资产 | 浏览量追踪、Umami 分析、管理仪表盘统计 | 有数据基础 |
| 国际化 | zh/en 双语支持、Paraglide i18n | 多语言就绪 |
| 主题系统 | 3 套主题、完整的主题契约 | 扩展性好 |

### 关键缺口（按 AdSense 过审视角）

| 缺口 | 严重程度 | 影响 |
|------|---------|------|
| 无 About / Contact / Privacy / Terms 页面 | **致命** | AdSense 直接拒审 |
| 无 ads.txt | **致命** | 广告无法投放 |
| 无 Cookie / Consent 机制 | **严重** | GDPR 不合规，欧盟流量无法变现 |
| 标签/作者无独立页面 | **严重** | 内容孤岛，搜索引擎难以建立权重 |
| 无 og:image / Twitter Card | **中等** | 社交分享体验差，间接影响流量 |
| 无面包屑结构化数据 | **中等** | 搜索结果展示不丰富 |
| noindex 不完整 | **中等** | 低质量页面被索引，拉低站点评分 |
| 图片无懒加载 | **中等** | LCP 可能超标 |
| 无 hreflang | **低** | 双语内容可能被视为重复内容 |

---

## 2. 外部建议评审

### 建议 1：选定垂直主题，做深不做广

> **原始建议**：做一个很窄的垂直主题，围绕几个固定专题持续产出：总览页、入门页、对比页、FAQ、实战案例、踩坑总结。

**判断：采纳，并补充。**

这个建议是内容策略层面的，属于运营指导而非代码实现。Flare Stack Blog 本身是一个通用博客框架，主题选择取决于使用者。但框架层面可以提供**专题组织能力**作为支撑——比如支持"系列文章"功能、支持文章间的"上一篇/下一篇"导航、提供 FAQ 结构化数据模板。这些是框架应该做、目前缺失的。

**采纳部分**：
- 框架增加"系列文章/专题"功能（将文章组织成有序序列）
- 支持 FAQ 页面类型的结构化数据

**不采纳部分**：
- "只做垂直"是运营决策，不应写入框架文档
- 框架应保持通用性，而非限定使用场景

---

### 建议 2：SEO 从功能升级为结构

> **原始建议**：文章页、作者页、标签页、专题页都要有清晰的标题层级、面包屑、摘要、内链；后台页、登录页、搜索结果页做好 noindex；sitemap 按内容类型拆分。

**判断：采纳，修正优先级。**

- **面包屑**：采纳。所有公共页面都需要 breadcrumb + BreadcrumbList JSON-LD
- **作者页/标签页**：采纳。这是当前最大的 SEO 缺口——标签和作者没有独立落地页
- **noindex**：当前 robots.txt 已 disallow 部分敏感路径，但应补 `<meta name="robots" content="noindex">` 做双重保险
- **sitemap 拆分**：**降优先级**。Google 现在推荐单个 sitemap index 指向多个子 sitemap，但当前的单一 sitemap 对中小站点完全够用。等文章数超过 5000 再考虑

---

### 建议 3：性能打磨到广告友好

> **原始建议**：首页首屏更轻、图片懒加载和压缩、字体和脚本更克制、减少不必要的客户端渲染、移动端优先。

**判断：采纳，需结合现有架构。**

项目已有优秀的缓存架构（CDN + KV + SWR），当前主要瓶颈在：
1. **图片**：R2 存储 + Cloudflare Images 已可用，但前端缺少懒加载和响应式图片
2. **字体**：需要 font-display: swap 和子集化
3. **客户端 JS 体积**：TanStack Start SSR 已做好服务端渲染，但需检查首屏 JS bundle

---

### 建议 4：补齐站点信任组件

> **原始建议**：About / Contact / Privacy Policy / Terms 页面、ads.txt、consent/cookie 流程。

**判断：全盘采纳，这是最高优先级。**

没有这些页面，AdSense 审核**直接不通过**。这是 P0 任务。

**补充**：
- About 页面应展示真实作者信息和站点目的
- Privacy Policy 需披露 D1/R2/KV/Cookie/分析工具的数据使用
- ads.txt 应作为站点文档（类似 robots.txt），通过 Hono 路由提供
- 面向欧盟用户的 CMP（Consent Management Platform）集成可选，但强烈建议

---

### 建议 5：内容生产变成长期资产

> **原始建议**：作者页、专题页、系列文章、更新日期、引用来源、相关文章推荐、热门内容回流、搜索词分析。

**判断：采纳，部分已有基础。**

- **相关文章推荐**：已存在（`post.relatedPostsLimit` 在主题配置中）
- **作者页**：采纳
- **系列文章**：采纳
- **搜索词分析**：采纳（可基于已有的浏览量系统扩展）
- **更新日期展示**：已在 Article JSON-LD 中输出 `dateModified`，但前端的"最后更新"信息不够显眼

---

### 总体评审结论

外部建议的五个方向**全部合理**，但优先级需要重新排列：

```
AdSense 过审必要条件（P0）：
  信任组件 > SEO 架构基础 > 性能基础

流量增长条件（P1）：
  专题/系列 > 作者/标签页 > 社交元数据

长期复利（P2）：
  搜索词分析 > 内链优化 > 内容回流
```

---

## 3. 总体策略

### 核心思路

```
信任组件（过审前提）
    ↓
SEO 架构（让内容被找到）
    ↓
性能体验（让用户留下来）
    ↓
内容体系（让用户回来）
    ↓
Google AdSense 接入
```

### 技术原则

- **新增页面走主题契约**：About/Contact/Privacy 等新页面需在三套主题中实现
- **静态内容走站点文档通道**：ads.txt 复用现有的 Hono 站点文档路由模式
- **结构化数据优先**：每个页面类型都应输出对应的 Schema.org JSON-LD
- **渐进增强**：性能优化不破坏现有缓存架构

---

## 4. Phase 1：站点信任与合规

> **目标**：满足 AdSense 站点审核的基本要求
> **周期**：1-2 周
> **优先级**：P0

### 4.1 新建静态页面

需要新建以下 4 个页面路由（公共布局，各主题实现）：

#### About 页面 (`/about`)

```
route: /about
SEO: title="关于本站", description, canonical, Organization JSON-LD
内容: 站点介绍、作者信息、技术栈、联系方式引导
```

#### Contact 页面 (`/contact`)

```
route: /contact
SEO: title="联系我们", description, canonical, ContactPage JSON-LD
内容: 联系表单 或 邮箱/社交链接
```

#### Privacy Policy 页面 (`/privacy`)

```
route: /privacy
SEO: title="隐私政策", description, canonical, noindex 可选
内容: 数据收集说明（Cookies、D1 存储、分析工具）、用户权利、联系方式
      必须包含: Google AdSense 数据使用声明、第三方 Cookie 说明
```

#### Terms of Service 页面 (`/terms`)

```
route: /terms
SEO: title="服务条款", description, canonical
内容: 使用条款、知识产权、免责声明
```

#### 实现要点

1. 在 `src/routes/_public/` 下新建 `about.tsx`、`contact.tsx`、`privacy.tsx`、`terms.tsx`
2. 在主题契约 `ThemeComponents` 中新增对应组件
3. 三个主题各实现一套（可先做 default，其他主题复用）
4. 导航栏和页脚添加链接

### 4.2 ads.txt

Google AdSense 要求 `https://你的域名/ads.txt` 可被访问。

```
实现方式：复用站点文档 Hono 路由模式
位置：src/features/site-documents/service/site-documents.service.ts
路由：/ads.txt
内容：google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

无需主题实现，纯文本响应。

### 4.3 完善 noindex 策略

当前 robots.txt 已 disallow 部分路径，但 Google 建议同时使用 meta robots 标签：

```
需要添加 <meta name="robots" content="noindex, nofollow"> 的页面：
- /search 搜索结果页
- /login, /register, /forgot-password, /verify-email, /reset-link 认证页
- /admin/* 所有管理后台页面
- /oauth/consent
- /unsubscribe
```

### 4.4 Cookie Consent（可选但建议）

- 引入轻量 consent banner（如 `react-cookie-consent` 或自定义）
- 仅在检测到欧盟 IP 时显示
- 配合 Privacy Policy 页面使用

---

## 5. Phase 2：SEO 架构升级

> **目标**：让搜索引擎高效抓取、理解、展示站点内容
> **周期**：2-4 周
> **优先级**：P0/P1

### 5.1 标签独立页面 (`/tags/$name`)

当前标签只是 `/posts?tagName=xxx` 的过滤参数，没有独立 URL。

```
route: /tags/$name
SEO: title="{标签名} - 相关文章", description, canonical, CollectionPage JSON-LD
数据: 标签信息 + 该标签下的文章列表（分页/无限滚动）
```

### 5.2 作者独立页面 (`/author/$username`)

当前文章页的 author 仅作为 JSON-LD 字段输出，没有作者聚合页。

```
route: /author/$username
SEO: title="{作者名} - 文章列表", description, canonical, Person + ProfilePage JSON-LD
数据: 作者信息 + 该作者的所有已发布文章
```

### 5.3 面包屑导航 + 结构化数据

为所有公共页面添加 BreadcrumbList JSON-LD：

| 页面 | 面包屑 |
|------|--------|
| 首页 | 首页 |
| /posts | 首页 > 文章列表 |
| /post/$slug | 首页 > 文章列表 > 文章标题 |
| /tags/$name | 首页 > 标签 > 标签名 |
| /author/$username | 首页 > 作者 > 作者名 |
| /about 等 | 首页 > 关于本站 |

### 5.4 Open Graph 完善

当前缺失：
- `og:image` — 自动生成（可使用 Cloudflare Images 或动态 OG 图生成）
- `article:published_time`、`article:modified_time`、`article:tag`
- `twitter:card`（summary_large_image）、`twitter:site`、`twitter:creator`

### 5.5 hreflang 标签

项目已有 zh/en 双语支持。为每个页面添加：

```html
<link rel="alternate" hreflang="zh" href="https://example.com/..." />
<link rel="alternate" hreflang="en" href="https://example.com/en/..." />
<link rel="alternate" hreflang="x-default" href="https://example.com/..." />
```

### 5.6 结构化数据扩展

| 页面类型 | Schema.org 类型 | 优先级 |
|---------|----------------|--------|
| 首页 | WebSite + SearchAction | P0 |
| 文章页 | Article → BlogPosting | P0（已有 Article，升级） |
| 标签页 | CollectionPage | P1 |
| 作者页 | ProfilePage + Person | P1 |
| 关于页 | Organization / Person | P1 |
| 联系页 | ContactPage | P1 |
| 面包屑 | BreadcrumbList | P0 |

### 5.7 Sitemap 增强

当前 sitemap 缺少：
- 标签页 URL
- 作者页 URL
- 静态页面 URL（about/contact/privacy/terms）

---

## 6. Phase 3：性能与体验打磨

> **目标**：Core Web Vitals 达标，移动端体验优秀
> **周期**：1-3 周
> **优先级**：P1

### 6.1 图片优化

```typescript
// 当前：直接使用 R2 原始 URL
// 改进：利用 Cloudflare Images 做按需转换

// 1. 响应式图片
<img srcset="...w480 480w, ...w800 800w, ...w1200 1200w"
     sizes="(max-width: 768px) 100vw, 800px"
     loading="lazy"
     decoding="async" />

// 2. 首屏图片 preload + fetchpriority="high"
// 3. 文章内图片统一懒加载
```

### 6.2 字体优化

```css
/* font-face 添加 font-display: swap */
@font-face {
  font-family: '...';
  src: url('...') format('woff2');
  font-display: swap;  /* 避免 FOIT */
}

/* 预加载关键字体 */
<link rel="preload" href="/fonts/..." as="font" crossorigin />
```

### 6.3 首屏 JS 减量

- 编辑器代码（TipTap）仅在管理后台加载，不在公共路由中出现
- 确保 TanStack Start 的 SSR 输出对公共页面有最小的 hydration JS
- 检查 bundle，移除未使用的依赖

### 6.4 移动端优化

- 触摸友好的导航（44x44px 最小触摸目标）
- 防止水平滚动
- 文章页字号不小于 16px（避免 iOS 缩放）
- 表格横向滚动

### 6.5 CLS（累积布局偏移）预防

- 所有 `<img>` 设置明确的 width/height
- 广告位预留固定高度
- 字体加载期间使用系统字体回退（font-display: swap + size-adjust）

---

## 7. Phase 4：内容生产体系

> **目标**：建立内容复利机制，提升用户粘性和回访率
> **周期**：4-8 周
> **优先级**：P1/P2

### 7.1 系列文章 / 专题功能

这是一个新功能模块：

```
features/series/
├── series.schema.ts      # Zod Schema + 缓存 Key
├── series.service.ts     # 业务逻辑
├── data/
│   └── series.data.ts    # Drizzle 查询
├── api/
│   └── series.api.ts     # Server Functions
└── components/
    └── SeriesNav.tsx      # 系列导航组件（上一篇/下一篇/目录）
```

数据库新增 `series` 表和 `post_series` 关联表。

### 7.2 "上一篇/下一篇"文章导航

在文章详情页底部添加上一篇/下一篇导航（基于发布时间），提升页面间流转。

### 7.3 相关文章增强

当前已有 `relatedPostsLimit` 配置，但需要确认实际实现是否基于标签/内容相似度推荐。

### 7.4 文章目录（Table of Contents）

为长文章自动生成目录（基于 h2/h3），固定在侧边栏或顶部。

### 7.5 搜索词分析

- 记录站内搜索词
- 管理后台展示搜索分析面板
- 反哺内容创作方向

### 7.6 社交分享组件

- Twitter/X、Facebook、LinkedIn 分享按钮
- 复制链接按钮
- 可选：生成文章封面图（用于社交分享）

---

## 8. Phase 5：持续增长与监测

> **目标**：建立数据驱动的增长飞轮
> **周期**：持续
> **优先级**：P2

### 8.1 Google Search Console 集成

- 提交 sitemap.xml
- 验证域名所有权
- 监控：索引覆盖率、搜索查询、点击率、Core Web Vitals
- 修复爬取错误

### 8.2 Google Analytics / 增强分析

当前使用 Umami（隐私友好），可保留。如需要更深入的 AdSense 关联数据，可增加 GA4。

### 8.3 Core Web Vitals 监控

- 通过 Cloudflare Web Analytics 或 Search Console 监控
- 设置 LCP < 2.5s、INP < 200ms、CLS < 0.1 的目标

### 8.4 内容日历 + 定期发布

运营层面：保持至少每周 1-2 篇高质量原创文章的节奏。

### 8.5 外链建设

- 友情链接系统已存在，可用于互换友链
- 在文章中引用权威来源
- 积极参与技术社区讨论

---

## 9. 实施 TODO 总表

### Phase 1：站点信任与合规（P0）

- [ ] **ads.txt 站点文档**
  - [ ] 在 `site-documents.service.ts` 中添加 `buildAdsTxt()` 函数
  - [ ] 在 `site-documents.route.ts` 中注册 `/ads.txt` 路由
  - [ ] 管理后台设置页增加 ads.txt 发布商 ID 配置项

- [ ] **新建 About 页面**
  - [ ] 在 `src/routes/_public/about.tsx` 创建路由
  - [ ] 在 `ThemeComponents` 契约中定义 `AboutPage` 组件接口
  - [ ] `default` 主题实现 AboutPage 组件
  - [ ] `fuwari` 主题实现 AboutPage 组件
  - [ ] `amazing` 主题实现 AboutPage 组件
  - [ ] 导航栏和页脚添加 About 链接

- [ ] **新建 Contact 页面**
  - [ ] 创建路由 `src/routes/_public/contact.tsx`
  - [ ] 三个主题各实现 ContactPage 组件
  - [ ] 导航栏和页脚添加 Contact 链接

- [ ] **新建 Privacy Policy 页面**
  - [ ] 创建路由 `src/routes/_public/privacy.tsx`
  - [ ] 三个主题各实现 PrivacyPage 组件
  - [ ] 页脚添加 Privacy 链接
  - [ ] 内容模板包含 Google AdSense 数据声明

- [ ] **新建 Terms of Service 页面**
  - [ ] 创建路由 `src/routes/_public/terms.tsx`
  - [ ] 三个主题各实现 TermsPage 组件
  - [ ] 页脚添加 Terms 链接

- [ ] **完善 noindex 策略**
  - [ ] 在 `__root.tsx` 或各布局中为 `/search`、认证页、管理后台页添加 `<meta name="robots" content="noindex, nofollow">`

- [ ] **Cookie Consent Banner（可选）**
  - [ ] 实现轻量 Consent Banner 组件
  - [ ] 仅在检测到欧盟 IP 时显示

### Phase 2：SEO 架构升级（P0/P1）

- [ ] **标签独立页面 `/tags/$name`**
  - [ ] 创建路由 `src/routes/_public/tags/$name.tsx`
  - [ ] 实现 `CollectionPage` JSON-LD
  - [ ] 三个主题实现 TagPage 组件
  - [ ] Sitemap 包含所有标签页 URL

- [ ] **作者独立页面 `/author/$username`**
  - [ ] 创建路由 `src/routes/_public/author/$username.tsx`
  - [ ] 实现 `ProfilePage` + `Person` JSON-LD
  - [ ] 三个主题实现 AuthorPage 组件
  - [ ] Sitemap 包含所有作者页 URL

- [ ] **面包屑组件 + BreadcrumbList JSON-LD**
  - [ ] 创建通用面包屑组件
  - [ ] 在所有公共布局中集成
  - [ ] 输出 BreadcrumbList JSON-LD

- [ ] **OG 标签完善**
  - [ ] 添加 `og:image` 生成（基于 Cloudflare Images 或动态 SVG）
  - [ ] 添加 `article:published_time`、`article:modified_time`、`article:tag`
  - [ ] 添加 `twitter:card`、`twitter:site`、`twitter:creator`

- [ ] **hreflang 标签**
  - [ ] 在 `__root.tsx` 或各页面头部添加 hreflang 链接

- [ ] **结构化数据扩展**
  - [ ] 首页添加 `WebSite` + `SearchAction` JSON-LD
  - [ ] 文章页从 `Article` 升级为 `BlogPosting`

- [ ] **Sitemap 增强**
  - [ ] 添加标签页 URL
  - [ ] 添加作者页 URL
  - [ ] 添加静态页面 URL（about/contact/privacy/terms）

### Phase 3：性能与体验打磨（P1）

- [ ] **图片懒加载**
  - [ ] 文章内容中的图片添加 `loading="lazy"` 和 `decoding="async"`
  - [ ] 首屏图片使用 `fetchpriority="high"` + preload

- [ ] **响应式图片**
  - [ ] 利用 Cloudflare Images 的 `width` 参数生成 srcset
  - [ ] 封装 ResponsiveImage 组件

- [ ] **字体子集化 + font-display: swap**
  - [ ] 确保所有 @font-face 包含 font-display: swap
  - [ ] 预加载关键字体文件

- [ ] **首屏 JS 减量**
  - [ ] 分析公共路由的 JS bundle
  - [ ] 确保编辑器代码仅在管理路由加载
  - [ ] 移除未使用的依赖

- [ ] **移动端体验**
  - [ ] 检查 44px 最小触摸目标
  - [ ] 文章页字号 ≥ 16px
  - [ ] 防止水平溢出

- [ ] **CLS 预防**
  - [ ] 图片设置显式尺寸
  - [ ] 广告预留位（Phase 5 时处理）

### Phase 4：内容生产体系（P1/P2）

- [ ] **系列文章功能**
  - [ ] 数据库表设计（series + post_series）
  - [ ] `features/series/` 模块实现
  - [ ] 系列导航组件（目录 + 上一篇/下一篇）
  - [ ] 管理后台系列管理 UI

- [ ] **文章内目录（TOC）**
  - [ ] 实现 TOC 生成逻辑（提取 h2/h3）
  - [ ] TOC 侧边栏组件
  - [ ] 滚动高亮当前位置

- [ ] **上一篇/下一篇导航**
  - [ ] 文章详情页底部添加上一篇/下一篇链接

- [ ] **搜索词分析**
  - [ ] 记录站内搜索词到 D1
  - [ ] 管理后台搜索分析面板

- [ ] **社交分享组件**
  - [ ] Twitter/X、Facebook、LinkedIn 分享按钮
  - [ ] 复制链接按钮

### Phase 5：持续增长与监测（P2）

- [ ] **Google Search Console 配置**
  - [ ] 提交 sitemap
  - [ ] 验证域名所有权
  - [ ] 建立监控流程

- [ ] **Core Web Vitals 监控**
  - [ ] 配置 Cloudflare Web Analytics
  - [ ] 设置性能预算告警

- [ ] **运营流程建立**
  - [ ] 内容日历模板
  - [ ] 定期发布节奏

---

## 10. 附录：AdSense 审核清单

### 提交前检查

| 检查项 | 要求 | 对应任务 |
|--------|------|---------|
| 原创内容 | ≥ 30 篇高质量原创文章 | 运营层面 |
| About 页面 | 真实身份、站点目的 | Phase 1 |
| Contact 页面 | 有效联系方式 | Phase 1 |
| Privacy Policy | 数据使用披露、Google 广告声明 | Phase 1 |
| Terms of Service | 使用条款 | Phase 1 |
| ads.txt | 根域可访问 | Phase 1 |
| 导航清晰 | 分类、搜索、面包屑 | Phase 2 |
| 无违禁内容 | 成人、暴力、盗版、仇恨言论 | 运营层面 |
| 移动友好 | 响应式设计 | Phase 3 |
| 加载速度 | LCP < 2.5s | Phase 3 |
| Cookie Consent | 针对欧盟用户 | Phase 1 |
| 域名年龄 | 部分区域要求 ≥ 6 个月 | 等待 |
| 流量 | 无硬性要求，但建议日均 100+ UV | 运营层面 |

### 提交后流程

1. 在 [Google AdSense](https://adsense.google.com) 注册并提交审核
2. 在网站 `<head>` 中添加 AdSense 验证代码
3. 等待审核（通常 2-4 周）
4. 通过后配置广告位，避免破坏用户体验

---

## 技术实现参考

### 新增站点文档（ads.txt）

参考现有的 `buildRobotsTxt()` 实现模式：

```typescript
// src/features/site-documents/service/site-documents.service.ts

export function buildAdsTxt(env: Env) {
  const publisherId = env.ADSENSE_PUBLISHER_ID; // 新增环境变量
  if (!publisherId) return "";
  return `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0`;
}
```

### 新增公共页面路由

参考现有的 `src/routes/_public/friend-links.tsx` 模式：

```typescript
// src/routes/_public/about.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/about")({
  component: AboutPage,
  head: () => ({
    links: [canonicalLink(buildCanonicalUrl(domain, "/about"))],
  }),
});

function AboutPage() {
  const { theme } = Route.useRouteContext();
  return <theme.AboutPage />;
}
```

### 面包屑 Structured Data

```typescript
export function buildBreadcrumbJsonLd(items: Array<{ name: string; href: string }>) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.href,
    })),
  });
}
```
