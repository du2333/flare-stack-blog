# 贡献指南

本地开发环境搭建见 [README](./README.md)。

## 提交前

提交前需通过以下检查：

```bash
bun check
bun test
```

## 提交信息

commit message 按 [Conventional Commits](https://www.conventionalcommits.org/) 规范编写：

```
feat: 添加 RSS 订阅
fix: 修复登录状态丢失
docs: 更新 README
```

## 提 PR

- 本地 `bun check` 和 `bun test` 均通过
- 在 PR 描述中说明改动内容和原因
- 有行为变化时补充对应测试

## 讨论

可通过 GitHub Issues 或 [Telegram 群](https://t.me/+vWuQYybv1kgxMDkx) 讨论。
