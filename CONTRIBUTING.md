# 贡献指南

感谢你对 Flare Stack Blog 的关注与支持！无论是一处文档错别字修正、界面文案润色，还是新功能特性与 Bug 修复，我们都非常欢迎社区贡献。

开始前请先阅读 [README.md](./README.md) 完成本地开发环境搭建。

## 参与流程

1. **Fork 与创建分支**
   - Fork 本仓库至你的 GitHub 账户。
   - 基于 `dev` 分支创建特性分支（例如 `feature/awesome-feature` 或 `fix/auth-issue`）。
2. **本地编码与验证**
   - 遵循项目现有的编码规范与目录架构。
   - 涉及多语言界面修改时，请务必同时更新 `messages/zh.json` 与 `messages/en.json`，并运行 `bun run i18n:compile`。删除界面文案后，用 `bun run i18n:prune-unused --write` 清掉不再使用的 key，CI 会拦下残留的未用 key。
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

## 升级说明（`upgrades.json`）

仓库根目录的 `upgrades.json` 记录每个已发布版本的升级说明，后台的更新提示与部署前的检查都读取它。`unreleased` 条目收集下一次发版的说明，发版时由 `scripts/release-check.ts` 盖上版本号并移入 `versions`，因此 `main` 上不会出现 `unreleased`。

- 引入破坏性改动或新增必填配置的 PR，要在同一个 PR 里往 `unreleased` 中加入对应事项：同步前必须完成的写在 `before`，部署后要做的写在 `after`，新增的必填配置写在 `requires.buildVars` 与 `requires.secrets`。破坏性改动只能随 major 发布，major 的 `unreleased` 必须有 `before` 事项。
- 新增必填配置属于破坏性改动：非 major 版本的 `unreleased` 不能在 `requires` 中列出任何 Build variable 或 Secret，新配置要么做成可选，要么随 major 发布。
- 每次发版都需要 `unreleased.summary`，用一句话概括本次版本，普通的 minor 和 patch 可以在发版前补上。
- 非 major 版本新增的迁移若出现 `DROP` 或 `RENAME`（例如 SQLite 重建表），文件中须有一行 `-- rollback-safe: <理由>`，说明上一版的代码为什么仍能在迁移后的数据库上运行。写不出理由的迁移只能放进 major。

## 社区与交流

如果你有新的构想或遇到疑问，欢迎通过以下渠道交流：
- 提出 [GitHub Issue](https://github.com/du2333/flare-stack-blog/issues)
- 加入 [Telegram 交流群](https://t.me/+vWuQYybv1kgxMDkx)
