# 贡献指南

感谢你对 Flare Stack Blog 的关注与支持！无论是一处文档错别字修正、界面文案润色，还是新功能特性与 Bug 修复，我们都非常欢迎社区贡献。

开始前请先阅读 [README.md](./README.md) 完成本地开发环境搭建。

## 参与流程

1. **Fork 与创建分支**
   - Fork 本仓库至你的 GitHub 账户。
   - 基于 `dev` 分支创建特性分支（例如 `feature/awesome-feature` 或 `fix/auth-issue`）。
2. **本地编码与验证**
   - 遵循项目现有的编码规范与目录架构。
   - 涉及多语言界面修改时，请务必同时更新 `messages/zh.json` 与 `messages/en.json`，并运行 `bun run i18n:compile`。
   - 涉及核心功能调整或 Bug 修复时，请补充或更新对应的自动化测试。
3. **提交代码前检查**
   提交前请确保在本地完整运行并通过以下检查：
   ```bash
   # 代码风格、格式化与 TypeScript 类型检查
   bun check

   # 运行完整自动化测试套件
   bun test
   ```
4. **提交信息规范**
   Git Commit 信息遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：
   ```
   feat: 增加文章目录动态高亮
   fix: 修复某些分辨率下封面拉伸问题
   docs: 完善 Cloudflare 部署步骤说明
   style: 优化前台公开页面文案
   ```
5. **创建 Pull Request**
   - 目标分支请选择 `dev` 分支。
   - 在 PR 描述中清晰说明本次修改的背景、改动内容及自测结果。
   - 若关联了现有 Issue，请在描述中附上 Issue 编号（例如 `Closes #12`）。

## 社区与交流

如果你有新的构想或遇到疑问，欢迎通过以下渠道交流：
- 提出 [GitHub Issue](https://github.com/du2333/flare-stack-blog/issues)
- 加入 [Telegram 交流群](https://t.me/+vWuQYybv1kgxMDkx)
