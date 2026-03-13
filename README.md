<div align="center">

中文 | [English](./docs/README.en.md)

# Flare Stack Blog

基于 **Cloudflare Workers** 的全栈现代化博客 CMS<br>
深度集成 D1、R2、KV、Workflows 等 Serverless 服务

[![License](https://img.shields.io/github/license/du2333/flare-stack-blog?style=flat-square)](https://github.com/du2333/flare-stack-blog/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/du2333/flare-stack-blog?style=flat-square)](https://github.com/du2333/flare-stack-blog/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/du2333/flare-stack-blog?style=flat-square)](https://github.com/du2333/flare-stack-blog/network/members)
[![React](https://img.shields.io/badge/React-19-blue?logo=react&style=flat-square)](https://react.dev)
[![TanStack Start](https://img.shields.io/badge/TanStack%20Start-black?logo=tanstack&style=flat-square)](https://tanstack.com/start)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?logo=tailwind-css&style=flat-square)](https://tailwindcss.com)

[部署指南](#部署指南) · [本地开发](#本地开发) · [开发规范](./docs/error-handling-quickstart.md)

</div>

---

> **注意**：本项目专为 Cloudflare 生态设计，**仅支持**部署在 Cloudflare Workers。

> 建了个 Telegram 群组，欢迎交流本项目相关问题 [Telegram 群](https://t.me/+vWuQYybv1kgxMDkx)

## 界面预览

<div align="center">
  <img src="docs/assets/home.png" alt="首页预览" width="49%">
  <img src="docs/assets/admin.png" alt="管理后台预览" width="49%">
</div>

## 核心功能

- **文章管理** — 富文本编辑器，支持代码高亮、图片上传、草稿/发布流程
- **标签系统** — 灵活的文章分类
- **评论系统** — 支持嵌套回复、邮件通知、审核机制
- **友情链接** — 用户申请、管理员审核、邮件通知
- **全文搜索** — 基于 Orama 的高性能搜索
- **媒体库** — R2 对象存储，图片管理与优化
- **用户认证** — GitHub OAuth 登录，权限控制
- **数据统计** — Umami 集成，访问分析与热门文章
- **AI 辅助** — Cloudflare Workers AI 集成
- **主题系统** — 可扩展的主题模板，支持完整替换所有页面和布局
- **导入导出** — 支持Markdown导入导出，保留图片以及Frontmatter

## 技术栈

### Cloudflare 生态

| 服务            | 用途                           |
| :-------------- | :----------------------------- |
| Workers         | 边缘计算与托管                 |
| D1              | SQLite 数据库                  |
| R2              | 对象存储（媒体文件）           |
| KV              | 缓存层                         |
| Durable Objects | 分布式限流                     |
| Workflows       | 异步任务（内容审核、定时发布） |
| Queues          | 消息队列（邮件通知）           |
| Workers AI      | AI 能力                        |
| Images          | 图片优化                       |

### 前端

- **框架**：React 19 + TanStack Router/Query
- **样式**：TailwindCSS 4
- **表单**：React Hook Form + Zod
- **图表**：Recharts

### 后端

- **网关层**：Hono（认证路由、媒体服务、缓存控制）
- **业务层**：TanStack Start（SSR、Server Functions）
- **数据库**：Drizzle ORM + drizzle-zod
- **认证**：Better Auth（GitHub OAuth）

### 编辑器

TipTap 富文本 + Shiki 代码高亮

### 目录结构

```
src/
├── features/
│   ├── posts/                  # 文章管理（其他模块结构类似）
│   │   ├── api/                # Server Functions（对外接口）
│   │   ├── data/               # 数据访问层（Drizzle 查询）
│   │   ├── posts.service.ts    # 业务逻辑
│   │   ├── posts.schema.ts     # Zod Schema + 缓存 Key 工厂
│   │   ├── components/         # 功能专属组件
│   │   ├── queries/            # TanStack Query Hooks
│   │   └── workflows/          # Cloudflare Workflows
│   ├── comments/    # 评论、嵌套回复、审核
│   ├── tags/        # 标签管理
│   ├── media/       # 媒体上传、R2 存储
│   ├── search/      # Orama 全文搜索
│   ├── auth/        # 认证、权限控制
│   ├── dashboard/   # 管理后台数据统计
│   ├── email/       # 邮件通知（Resend）
│   ├── cache/       # KV 缓存服务
│   ├── config/      # 博客配置
│   ├── friend-links/# 友情链接（申请、审核）
│   ├── import-export/# Markdown 导入导出
│   ├── version/     # 版本更新检查
│   ├── theme/       # 主题系统（契约、注册表、各主题实现）
│   └── ai/          # Workers AI 集成
├── routes/
│   ├── _public/     # 公开页面（首页、文章列表/详情、搜索）
│   ├── _auth/       # 登录/注册相关页面
│   ├── _user/       # 用户相关页面
│   ├── admin/       # 管理后台（文章、评论、媒体、标签、设置）
│   ├── rss[.]xml.ts     # RSS Feed
│   ├── sitemap[.]xml.ts # Sitemap
│   └── robots[.]txt.ts  # Robots.txt
├── components/      # UI 组件（ui/, common/, layout/, tiptap-editor/）
├── lib/             # 基础设施（db/, auth/, hono/, middlewares）
└── hooks/           # 自定义 Hooks
```

### 主题系统

Flare Stack Blog 的所有面向用户的页面与布局均通过 **主题契约（Theme Contract）** 与业务逻辑解耦。你可以在不修改任何路由或数据逻辑的前提下，完整替换博客的视觉表现层。

→ **[主题开发教程](./docs/theme-guide.md)** — 了解如何从零创建你的第一个自定义主题。

#### 可用主题

站点个性化配置（标题、描述、社交链接、favicon、默认主题背景图等）现在统一在后台“设置”页面维护。`src/blog.config.ts` 主要作为默认值与兜底配置；主题开发时，建议结合 [主题开发教程](./docs/theme-guide.md) 查看实际可用的运行时 `siteConfig`。

<table>
  <tr>
    <th>主题</th>
    <th>预览</th>
  </tr>
  <tr>
    <td><code>default</code>（默认）</td>
    <td><img src="docs/assets/home.png" alt="Default theme preview" /></td>
  </tr>
  <tr>
    <td><code>fuwari</code></td>
    <td><img src="docs/assets/fuwari.png" alt="Fuwari theme preview" /></td>
  </tr>
</table>

> 欢迎提交你的自定义主题！参考 [主题开发教程](./docs/theme-guide.md) 完成开发后，可以通过 PR 将你的主题添加到这里。

### 请求流程

```
请求 → Cloudflare CDN（边缘缓存）
         ↓ 未命中
      server.ts（Hono 入口）
         ├── /api/auth/* → Better Auth
         ├── /images/*   → R2 媒体服务
         └── 其他        → TanStack Start
                              ↓
                         中间件注入（db, auth, session）
                              ↓
                         路由匹配 + Loader 执行
                              ↓
                  KV 缓存 ←→ Service 层 ←→ D1 数据库
                              ↓
                         SSR 渲染（带缓存头）
```

## 部署指南

请参考 **[Flare Stack Blog 部署教程](https://blog.dukda.com/post/flare-stack-blog%E9%83%A8%E7%BD%B2%E6%95%99%E7%A8%8B)**，包含 Cloudflare 资源创建、凭证获取、GitHub OAuth 配置、两种部署方式的详细图文步骤及常见问题排查。

**[视频教程](https://www.bilibili.com/video/BV1R4fnBhEs4?p=2)** 已上线

---

## 环境变量参考

| 文件        | 用途                                   |
| :---------- | :------------------------------------- |
| `.env`      | 客户端变量（`VITE_*`），Vite 读取      |
| `.dev.vars` | 服务端变量，Wrangler 注入 Worker `env` |

### 必填

| 变量名                       | 用途   | 说明                                              |
| :--------------------------- | :----- | :------------------------------------------------ |
| `CLOUDFLARE_API_TOKEN`       | CI/CD  | Cloudflare API Token（Worker 部署 + D1 读写权限） |
| `CLOUDFLARE_ACCOUNT_ID`      | CI/CD  | Cloudflare Account ID                             |
| `D1_DATABASE_ID`             | CI/CD  | D1 数据库 ID                                      |
| `KV_NAMESPACE_ID`            | CI/CD  | KV 命名空间 ID                                    |
| `BUCKET_NAME`                | CI/CD  | R2 存储桶名称                                     |
| `BETTER_AUTH_SECRET`         | 运行时 | 会话加密密钥，运行 `openssl rand -hex 32` 生成    |
| `BETTER_AUTH_URL`            | 运行时 | 应用 URL（如 `https://blog.example.com`）         |
| `ADMIN_EMAIL`                | 运行时 | 管理员邮箱                                        |
| `GITHUB_CLIENT_ID`           | 运行时 | GitHub OAuth Client ID                            |
| `GITHUB_CLIENT_SECRET`       | 运行时 | GitHub OAuth Client Secret                        |
| `CLOUDFLARE_ZONE_ID`         | 运行时 | Cloudflare Zone ID                                |
| `CLOUDFLARE_PURGE_API_TOKEN` | 运行时 | 具有 Purge CDN 权限的 API Token                   |
| `DOMAIN`                     | 运行时 | 博客域名（如 `blog.example.com`）                 |

### 可选

| 变量名                    | 用途   | 说明                                                                                                      |
| :------------------------ | :----- | :-------------------------------------------------------------------------------------------------------- |
| `THEME`                   | 构建时 | 主题名称，默认 `default`，详见 [可用主题](#可用主题)                                                      |
| `TURNSTILE_SECRET_KEY`    | 运行时 | Cloudflare Turnstile 人机验证 Secret Key                                                                  |
| `VITE_TURNSTILE_SITE_KEY` | 构建时 | Cloudflare Turnstile Site Key                                                                             |
| `GITHUB_TOKEN`            | 运行时 | GitHub API Token（版本更新检查，避免限流）                                                                |
| `LOCALE`                  | 运行时 | 默认语言，支持 `zh` / `en`，默认 `zh`；通知邮件、Webhook 文本和后台异步任务文案会使用该语言               |
| `CDN_DOMAIN`              | 运行时 | 独立 CDN 域名（如 `cdn.example.com`），purge 时优先使用；须为当前 Zone 下通过 SaaS CNAME 接入的自定义域名 |
| `UMAMI_SRC`               | 运行时 | Umami 基础 URL（Cloud: `https://cloud.umami.is`）                                                         |
| `UMAMI_API_KEY`           | 运行时 | Umami Cloud API key（仅 Cloud 版本）                                                                      |
| `UMAMI_USERNAME`          | 运行时 | Umami 用户名（仅自部署版本）                                                                              |
| `UMAMI_PASSWORD`          | 运行时 | Umami 密码（仅自部署版本）                                                                                |
| `VITE_UMAMI_WEBSITE_ID`   | 构建时 | Umami Website ID                                                                                          |

---

## 本地开发

### 前置要求

- [Bun](https://bun.sh) >= 1.3
- Cloudflare 账号（用于远程 D1/R2/KV 资源）

### 快速开始

```bash
# 安装依赖
bun install

# 配置环境变量
cp .env.example .env        # 客户端变量
cp .dev.vars.example .dev.vars  # 服务端变量

# 配置 Wrangler
cp wrangler.example.jsonc wrangler.jsonc
# 编辑 wrangler.jsonc，填入你的资源 ID

# 启动开发服务器
bun dev
```

### 登录管理后台

**方式一：邮箱密码注册（无需第三方服务）**

1. 访问 `http://localhost:3000` 注册页面，使用 `.dev.vars` 中配置的 `ADMIN_EMAIL` 注册账号
2. 开发环境下验证邮件不会真正发送，验证链接会打印到控制台，复制访问即可完成验证
3. 验证后自动登录，系统根据 `ADMIN_EMAIL` 自动赋予管理员权限

**方式二：GitHub OAuth**

1. 前往 [GitHub Developer Settings](https://github.com/settings/developers) 创建一个 OAuth App
2. Homepage URL 填 `http://localhost:3000`，Authorization callback URL 填 `http://localhost:3000/api/auth/callback/github`
3. 将 Client ID 和 Client Secret 填入 `.dev.vars`

### 常用命令

| 命令            | 说明                        |
| :-------------- | :-------------------------- |
| `bun dev`       | 启动开发服务器（端口 3000） |
| `bun run build` | 构建生产版本                |
| `bun run test`  | 运行测试                    |
| `bun lint`      | ESLint 检查                 |
| `bun check`     | 类型检查 + Lint + 格式化    |

### 数据库命令

| 命令              | 说明                                |
| :---------------- | :---------------------------------- |
| `bun db:studio`   | 启动 Drizzle Studio（可视化数据库） |
| `bun db:generate` | 生成迁移文件                        |
| `bun db:migrate`  | 安全应用远程 D1 迁移，校验失败自动回滚 |
| `bun db:migrate:local` | 安全应用本地 D1 迁移，校验失败自动恢复 |
| `bun db:migrate:unsafe` | 直接应用远程 D1 迁移，不做校验 |

`bun db:migrate` / `bun db:migrate:local` 会复用 schema 中定义的状态常量，在迁移前后校验以下关键计数是否一致：

- `posts`：总文章数，以及每个文章状态的数量
- `comments`：总评论数、根评论数、子评论数，以及每个评论状态的数量

安全脚本还会额外做这些事情：

- 远程模式：默认只记录 D1 Time Travel bookmark，校验失败时自动执行 restore
- 远程模式：如需额外保留 SQL 快照，可手动运行 `bun scripts/safe-d1-migrate/main.ts --remote --with-export`
- 本地模式：快照 `.wrangler/state`（或你传入的 `--persist-to`），校验失败时自动恢复本地持久化目录

### 本地模拟 Cloudflare 资源

默认配置使用远程 D1/R2/KV 资源。如需完全本地开发，可在 `wrangler.jsonc` 中移除 `remote: true`，Miniflare 会自动模拟这些服务：

```jsonc
{
  "d1_databases": [{ "binding": "DB", ... }],  // 移除 "remote": true
  "r2_buckets": [{ "binding": "R2", ... }],    // 移除 "remote": true
  "kv_namespaces": [{ "binding": "KV", ... }]  // 移除 "remote": true
}
```

> **注意**：本地模拟的数据不会同步到远程，适合初期开发和测试。本地数据库迁移推荐使用：
>
> ```bash
> bun db:migrate:local
> ```

## 贡献

欢迎贡献代码、报告问题或提出建议！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解开发指南和代码规范。

开始改动业务前，建议先阅读 [错误处理与 Result 模式快速上手](./docs/error-handling-quickstart.md)。
