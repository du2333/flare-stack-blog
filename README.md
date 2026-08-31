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

<img src="docs/assets/fuwari.png" alt="公开站预览" />

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

图文教程见 **[部署教程](https://blog.dukda.com/post/flare-stack-blog%E9%83%A8%E7%BD%B2%E6%95%99%E7%A8%8B)**，另有 **[视频教程](https://www.bilibili.com/video/BV1R4fnBhEs4?p=2)**。

## 本地开发

需要 [Bun](https://bun.sh) >= 1.3。

```bash
bun install

cp .env.example .env
cp .dev.vars.example .dev.vars
cp wrangler.example.jsonc wrangler.jsonc
```

按三个文件中的注释填写配置，`wrangler.jsonc` 还需填入资源 ID，然后运行 `bun dev`，浏览器访问 http://localhost:3000 即可。

使用 `.dev.vars` 中的 `ADMIN_EMAIL` 注册账号。开发环境不会实际发送验证邮件，验证链接会打印在控制台，点击即可完成验证；验证通过后该邮箱会被设为管理员。

| 命令                   | 说明                  |
| :--------------------- | :-------------------- |
| `bun dev`              | 开发服务器，端口 3000 |
| `bun check`            | 提交前检查            |
| `bun test`             | 测试                  |
| `bun db:migrate:local` | 本地 D1 迁移          |
| `bun db:studio`        | Drizzle Studio        |

## 贡献

欢迎提 issue 和 PR，流程见 [CONTRIBUTING.md](./CONTRIBUTING.md)。
