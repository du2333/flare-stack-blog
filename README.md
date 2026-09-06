<div align="center">

# Flare Stack Blog

基于 **Cloudflare Workers** 的博客 CMS<br>
使用 D1、R2、KV、Queues 等 Cloudflare 服务

[![License](https://img.shields.io/github/license/du2333/flare-stack-blog?style=flat-square)](https://github.com/du2333/flare-stack-blog/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/du2333/flare-stack-blog?style=flat-square)](https://github.com/du2333/flare-stack-blog/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/du2333/flare-stack-blog?style=flat-square)](https://github.com/du2333/flare-stack-blog/network/members)
[![React](https://img.shields.io/badge/React-19-blue?logo=react&style=flat-square)](https://react.dev)
[![TanStack Start](https://img.shields.io/badge/TanStack%20Start-black?logo=tanstack&style=flat-square)](https://tanstack.com/start)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?logo=tailwind-css&style=flat-square)](https://tailwindcss.com)

[演示站点](https://blog.dukda.com) · [部署指南](#部署指南) · [本地开发](#本地开发) · [贡献](./CONTRIBUTING.md)

</div>

---

> 目前只支持部署到 Cloudflare Workers。

> 项目交流：[Telegram 群](https://t.me/+vWuQYybv1kgxMDkx)。

## 界面预览

<div align="center">
  <img src="docs/assets/home.png" alt="首页预览" width="49%">
  <img src="docs/assets/admin.png" alt="管理后台预览" width="49%">
</div>

## 核心功能

- **文章**：TipTap 富文本，支持代码高亮、数学公式、图片、封面和置顶
- **版本历史**：发布时自动保存快照，可随时从历史版本恢复
- **标签**：一篇文章可添加多个标签
- **分类**：一篇文章最多一个分类
- **评论**：作者或管理员可删除评论，管理员可禁言用户
- **友情链接**：用户申请，管理员审核
- **通知**：邮件和 Webhook，可按事件订阅
- **搜索**：Orama 全文搜索
- **媒体库**：文件存储于 R2，图片读取经 Cloudflare Image Resizing 处理
- **认证**：邮箱密码和 GitHub OAuth 登录
- **API Key**：管理员签发，通过 `x-api-key` 请求头调用 `/api`
- **统计**：Umami 访问分析，每天同步文章热度供首页排序
- **订阅与 SEO**：Canonical、Schema.org、RSS / Atom / JSON Feed、Sitemap、Robots
- **界面语言**：公开站和管理后台支持中英文切换

## 技术栈

| Cloudflare      | 用途           |
| :-------------- | :------------- |
| Workers         | 运行与托管     |
| D1              | 数据库         |
| R2              | 媒体存储       |
| KV              | 缓存           |
| Durable Objects | 限流           |
| Queues          | 邮件和 Webhook |
| Image Resizing  | 图片优化       |

- 前端：React 19、TanStack Start / Router / Query、Tailwind CSS 4
- JSON API：基于 oRPC 的 OpenAPI，位于 `/api`
- 认证：Better Auth（`/api/auth/*`）
- 数据库：Drizzle
- 编辑器：TipTap + Shiki

## 部署指南

Fork 本仓库。在 Cloudflare 创建 Worker、D1、KV、R2 和 Queue，名称自定。将 Worker 连接到这个 fork，生产分支选你要自动部署的分支。构建命令 `bun run wrangler:prepare && bun run build`，部署命令 `bun run deploy`。构建镜像已带 Bun；若版本不对，加构建变量 `BUN_VERSION`。

`wrangler.jsonc` 由构建时的 `wrangler:prepare` 生成，不要提交。构建变量里填写 `WORKER_NAME`（须与 Dashboard 中的 Worker 名称一致）、`QUEUE_NAME`（须与你创建的 Queue 名称一致）、`DOMAIN`、`D1_DATABASE_ID`、`KV_NAMESPACE_ID`、`BUCKET_NAME`。

部署完成后，在 Worker「设置 → 变量和机密」填写运行时变量。`keep_vars` 已开启，之后的部署不会清掉这些值。`VITE_*` 写在 Builds 的构建变量里，改完需要重新部署。

### 环境变量

运行时变量写在 `.dev.vars`（本地）或 Worker 机密（生产）。构建时变量写在 `.env`（本地）或 Builds 构建变量（生产）。

**运行时 · 必填**

| 变量                                        | 说明                                                     |
| :------------------------------------------ | :------------------------------------------------------- |
| `BETTER_AUTH_SECRET`                        | `openssl rand -hex 32`                                   |
| `BETTER_AUTH_URL`                           | 站点 URL，如 `https://blog.example.com`                  |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth。当前认证配置需要这两项，即便主要用邮箱登录 |
| `DOMAIN`                                    | 主机名，如 `blog.example.com`                            |

GitHub OAuth 回调地址：`https://<DOMAIN>/api/auth/callback/github`。

**运行时 · 可选**

| 变量                                | 说明                                              |
| :---------------------------------- | :------------------------------------------------ |
| `ENVIRONMENT`                       | 本地用 `dev` 可跳过发信。生产不要设为 `dev`       |
| `UMAMI_WEBSITE_ID`                  | 与构建时的 `VITE_UMAMI_WEBSITE_ID` 填同一个 id    |
| `UMAMI_SRC`                         | Umami 脚本源，如 `https://cloud.umami.is`         |
| `UMAMI_API_URL`                     | 统计 API。Cloud 可省略                            |
| `UMAMI_API_KEY`                     | Umami Cloud。不要和用户名密码同时配               |
| `UMAMI_USERNAME` / `UMAMI_PASSWORD` | 自托管 Umami                                      |
| `TURNSTILE_SECRET_KEY`              | 还需构建时的 `VITE_TURNSTILE_SITE_KEY`            |
| `GITHUB_TOKEN`                      | 版本检查用，避免 Workers 共享 IP 触发 GitHub 限流 |

**构建时 · 可选**

| 变量                      | 说明             |
| :------------------------ | :--------------- |
| `VITE_UMAMI_WEBSITE_ID`   | 公开页埋点       |
| `VITE_TURNSTILE_SITE_KEY` | 人机验证站点 key |

**构建时 · `wrangler:prepare` 必填**

| 变量 | 说明 |
| :-- | :-- |
| `WORKER_NAME` | 须与 Dashboard 中的 Worker 名称一致 |
| `QUEUE_NAME` | 须与你创建的 Queue 名称一致 |
| `DOMAIN` | 与运行时相同 |
| `D1_DATABASE_ID` | D1 数据库 ID |
| `KV_NAMESPACE_ID` | KV 命名空间 ID |
| `BUCKET_NAME` | R2 桶名 |

本地 `db:studio` / `db:push` 还用 `.env` 里的 `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_DATABASE_ID`、`CLOUDFLARE_D1_TOKEN`，它们不进 Worker。

## 本地开发

需要 [Bun](https://bun.sh) >= 1.3。

```bash
bun install

cp .env.example .env
cp .dev.vars.example .dev.vars
cp wrangler.example.jsonc wrangler.jsonc
```

按三个文件中的注释填写配置，`wrangler.jsonc` 还需填入资源 ID，然后运行 `bun dev`，浏览器访问 http://localhost:3000 即可。

第一个注册的账号会成为管理员。开发环境不会实际发送验证邮件，验证链接会打印在控制台，点击即可完成验证。

| 命令                   | 说明                  |
| :--------------------- | :-------------------- |
| `bun dev`              | 开发服务器，端口 3000 |
| `bun check`            | 提交前检查            |
| `bun test`             | 测试                  |
| `bun db:migrate:local` | 本地 D1 迁移          |
| `bun db:studio`        | Drizzle Studio        |

## 贡献

欢迎提 issue 和 PR，流程见 [CONTRIBUTING.md](./CONTRIBUTING.md)。
