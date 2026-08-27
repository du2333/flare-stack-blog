# Umami 博文热度同步调研

调研时间：2026-08-23

范围：Umami 官方文档，以及官方仓库 `umami-software/umami` 的
[`ca661c7`](https://github.com/umami-software/umami/commit/ca661c7057984aa98ed4f7083d84dae2f65bfcb0)
版本。本文只讨论从 Umami 取回博文浏览数据，用于首页热度排序。

## 结论

不要按“Umami 每次访问后调用我们的 Webhook”来设计。当前官方文档没有提供逐次 pageview 的出站 Webhook，官方源码也没有对应实现。Umami 文档给自动报表的做法是定时调用统计 API，并明确列出 cron、GitHub Actions 和 serverless function 作为调度方式。[官方自动报表指南](https://docs.umami.is/docs/guides/automate-reporting-with-api)

这个项目最省事的方案是：每天拉一次一个已结束时间窗内的按 path 聚合数据，映射到 Published Post，然后原子替换本地热度快照。推荐先用最近 30 天的 pageviews。这样只需要一份小型物化快照，不需要保存访客、逐次浏览记录或每日明细。

应调用：

```text
GET /api/websites/:websiteId/metrics/expanded
  ?startAt=<epoch-ms>
  &endAt=<epoch-ms>
  &type=path
  &limit=500
  &offset=0
```

返回项中的 `name` 是 path，`pageviews` 才是浏览次数。不要把普通的 `/metrics?type=path` 的 `y` 当成 PV。当前源码里那个值是按 `session_id` 去重后的访客数。[expanded metrics 文档](https://docs.umami.is/docs/api/website-stats#get-apiwebsiteswebsiteidmetricsexpanded) [普通 metrics 的查询源码](https://github.com/umami-software/umami/blob/ca661c7057984aa98ed4f7083d84dae2f65bfcb0/src/queries/sql/pageviews/getPageviewMetrics.ts#L83-L103) [expanded metrics 的查询源码](https://github.com/umami-software/umami/blob/ca661c7057984aa98ed4f7083d84dae2f65bfcb0/src/queries/sql/pageviews/getPageviewExpandedMetrics.ts#L96-L129)

## Webhook 到底有没有

截至本次调研，没有找到 Umami 支持的“pageview 发生后向自定义 URL 推送”的出站 Webhook：

- 官方文档站点地图没有 Webhook 功能或 API；Cloud 的 Notifications 页面只管理产品功能和更新邮件。[官方站点地图](https://docs.umami.is/sitemap.xml) [Cloud Notifications](https://docs.umami.is/docs/cloud/notifications)
- 对上面固定 commit 的官方仓库全量搜索 `webhook`，没有找到路由、数据模型或投递代码。
- 官方自动化指南采用统计 API 拉取，并让调用方自行用 cron、GitHub Actions 或 serverless function 调度。[官方自动报表指南](https://docs.umami.is/docs/guides/automate-reporting-with-api)

Umami 确实有 `POST /api/send`，但方向相反。它是浏览器或服务端向 Umami 发送采集事件的入口，不是 Umami 回调业务系统的 Webhook。它不要求认证，支持 `event`、`identify`、`performance` 三种 `type`，payload 可带 `hostname`、`url`、`referrer`、`title`、`website`、`name` 和 `data` 等字段。[Sending stats](https://docs.umami.is/docs/api/sending-stats)

本项目已经代理 `/api/send`，理论上可以在代理层旁路复制每个请求。但这会重新承担验证、去重、失败重试、机器人流量和口径一致性问题，实际又回到了自建统计。它不比现有 pageview 模块简单，也不能保证与 Umami 最终统计值一致。

因此，Webhook 的触发类型和出站 payload 在这里是“不适用”，因为官方没有这个 pageview 出站机制。不要根据 `/api/send` 的入站 payload 猜一个 Webhook 协议。

## 可用 API

### 按 path 取浏览数

`GET /api/websites/:websiteId/metrics/expanded` 接受 `startAt`、`endAt`、`type`、`limit`、`offset` 和过滤条件。`type=path` 时，每项包含：

```json
{
  "name": "/posts/example",
  "pageviews": 120,
  "visitors": 80,
  "visits": 91,
  "bounces": 0,
  "totaltime": 0
}
```

官方文档给出的默认分页大小是 500，使用 `offset` 继续取下一页，没有给出硬性最大值。[Website statistics](https://docs.umami.is/docs/api/website-stats#get-apiwebsiteswebsiteidmetricsexpanded)

源码确认 `pageviews` 是该 path 下的事件计数之和，`visitors` 和 `visits` 分别按 session 和 visit 去重。查询默认 `limit=500`，但返回顺序是 `visitors desc, visits desc`，不是按 pageviews 排序。因此同步端必须取全、按 path 去重，再在本地按 `pageviews` 计算热度。[PostgreSQL 查询](https://github.com/umami-software/umami/blob/ca661c7057984aa98ed4f7083d84dae2f65bfcb0/src/queries/sql/pageviews/getPageviewExpandedMetrics.ts#L37-L43) [聚合与排序](https://github.com/umami-software/umami/blob/ca661c7057984aa98ed4f7083d84dae2f65bfcb0/src/queries/sql/pageviews/getPageviewExpandedMetrics.ts#L96-L129) [ClickHouse 查询](https://github.com/umami-software/umami/blob/ca661c7057984aa98ed4f7083d84dae2f65bfcb0/src/queries/sql/pageviews/getPageviewExpandedMetrics.ts#L186-L218)

建议固定 `limit=500`，从 `offset=0` 开始，直到某页少于 500 条。若有 500 条以上 path，不要只同步第一页。分页期间要使用已经结束的固定时间窗，否则流量变化会改变排序，使 offset 分页跳行或重复。

### 不应混用的端点

- `/metrics?type=path` 返回 `{x, y}`。官方 API 文档将 `y` 定义为 visitors；当前 PostgreSQL 和 ClickHouse 源码也分别使用 `count(distinct session_id)` 和 `uniq(session_id)`。[API 文档](https://docs.umami.is/docs/api/website-stats#get-apiwebsiteswebsiteidmetrics) [查询源码](https://github.com/umami-software/umami/blob/ca661c7057984aa98ed4f7083d84dae2f65bfcb0/src/queries/sql/pageviews/getPageviewMetrics.ts#L83-L103)
- 自动报表指南的 Top pages 示例却把该端点的 `y` 写成 views。这与当前 API 参考和源码冲突，不能据此把 `y` 当成 PV。[冲突的官方示例](https://docs.umami.is/docs/guides/automate-reporting-with-api#example-top-pages-report)
- `/pageviews` 返回全站或单个过滤 path 的时间序列，适合画趋势，不适合一次取回所有博文的 PV。[Pageviews API](https://docs.umami.is/docs/api/website-stats#get-apiwebsiteswebsiteidpageviews)
- `/stats` 返回时间范围内的全站汇总，不能用于文章间排序。[Stats API](https://docs.umami.is/docs/api/website-stats#get-apiwebsiteswebsiteidstats)

## 认证和部署差异

### Umami Cloud

- API base URL 是 `https://api.umami.is/v1`。也可在 `/v1` 后加 `us` 或 `eu` 来指定 region。
- 使用 Cloud 控制台生成的 API key，通过 `Authorization: Bearer <api-key>` 发送。
- 一个 API key 的公开限制是每 15 秒 50 次调用。
- API key 可调用 API 参考中的统计路由，例外主要是修改密码和用户管理路由。

来源：[Cloud API Key](https://docs.umami.is/docs/cloud/api-key)

Cloud 免费账户还有一个影响“全历史热度”的限制。当前服务端源码会把无订阅账户的查询起点截到六个月前，所以即使传入更早的 `startAt`，也取不到完整历史。[Cloud 查询窗口源码](https://github.com/umami-software/umami/blob/ca661c7057984aa98ed4f7083d84dae2f65bfcb0/src/lib/request.ts#L99-L113)

### Self-hosted Umami

- API base URL 是自托管实例的 `/api`。
- 先向 `POST /api/auth/login` 提交用户名和密码，取得 token，再用 `Authorization: Bearer <token>` 调统计 API。[Authentication](https://docs.umami.is/docs/api/authentication)
- 官方文档没有为 self-hosted 统计 API 声明统一调用额度。实际容量取决于部署和数据库，不能把“未声明”解释为无限。
- API 行为随部署版本变化。实施时应对照实际 Umami 版本验证字段和聚合口径，不能只按当前 Cloud 文档假定。

定时任务每次运行时重新登录比长期保存 self-hosted bearer token 更稳妥。若启用了会影响自动登录的认证策略，应为同步任务准备权限受限的专用账户。

## 推荐同步方式

几种方式放在一起看，选择很清楚：

| 方式 | 结论 | 原因 |
| --- | --- | --- |
| Umami 出站 Webhook | 不可用 | 当前没有官方 pageview Webhook |
| 定时拉统计 API | 推荐 | 官方支持，拿到的是 Umami 最终聚合口径 |
| 旁路复制 `/api/send` | 不推荐 | 又要自行处理逐事件可靠性，且未必等于 Umami 最终值 |
| 直查 Umami 数据库 | 不推荐 | 绑定内部 schema，Cloud 也不可用 |
| 手工 CSV export | 只适合迁移/审计 | Cloud export 是异步导出，不适合每日热度同步 [Export data](https://docs.umami.is/docs/cloud/export-data) |

若部署在 Cloudflare Workers，可用 Cron Trigger 每天运行一次。Umami 官方并不限定调度器，指南明确允许 cron、GitHub Actions 或 serverless function。[Running on a schedule](https://docs.umami.is/docs/guides/automate-reporting-with-api#running-on-a-schedule)

## 最小实现建议

首页只需要一个排序分值时，不要同步每日明细，更不要保存逐次 pageview。每天重算一个窗口快照即可：

1. 选定业务时区和热度窗口。建议先用“截至昨天的最近 30 个完整自然日”。
2. 调 `/metrics/expanded?type=path`，分页取全这个固定窗口。
3. 规范化 path，并只映射到当前 Published Post。
4. 用 `pageviews` 作为 score，在同一数据库事务中替换整份快照。
5. 首页读取上一次成功快照。同步失败时继续使用旧快照，不把所有文章热度清零。

本地最少只需保存这些事实：

```text
postId
score
windowStart
windowEnd
syncedAt
```

`path` 可以作为同步日志或排错字段，但不应成为长期主键。文章身份应由 `postId` 表示。

### 为什么推荐整窗重算

- 一次 Umami 查询已经完成按 path 聚合。再拆成日表并累加，没有给首页排序增加能力。
- 它天然修正延迟到达的数据和上次漏同步，不需要增量游标。
- Umami 当前查询源码使用包含两端的 `between startDate and endDate`。如果把相邻日窗直接首尾相接后累加，恰好落在边界的事件可能重复。整窗重算没有这个累加问题。[查询边界源码](https://github.com/umami-software/umami/blob/ca661c7057984aa98ed4f7083d84dae2f65bfcb0/src/queries/sql/pageviews/getPageviewExpandedMetrics.ts#L116-L128)

如果以后确实需要趋势图，再增加按日事实表。届时每次覆盖最近几天，不要只追加昨天；相邻日窗应使用明确的不重叠边界，例如下一天零点减 1 毫秒作为 `endAt`。

## 上线前必须定清的口径

### 热度窗口

全历史 PV 会持续偏向老文章。最近 30 天更像“近期热门”，也绕开了 Cloud 免费账户只能查询最近六个月的问题。若产品想表达“经典文章”，可以另设全历史榜单，但不要混用同一个“热门”标签。

### path 和文章的映射

Umami 认识的是 URL path，业务认识的是 post ID。以下情况必须有明确规则：

- 尾斜杠、大小写、URL 编码和重复路径先规范化。
- 只接受博客公开路由，排除后台、预览、分页、标签页和 404。
- 已下线文章不能进入首页排序，即使 Umami 仍有历史流量。
- slug 修改会把同一文章拆成旧 path 和新 path。若希望继承热度，需要保留 slug alias 到 post ID 的映射；否则明确从改名后重新累计。
- 一次同步中若多个 path 映射到同一个 post ID，应先求和再写入。

### 空值和删除

整份快照必须包含所有 Published Post。Umami 没返回的文章 score 写 0。只 upsert 有流量的文章会留下旧分值，导致已无流量或改过 slug 的文章长期占榜。

### 数据含义

这个 score 应命名为“Umami 观测到的 pageviews”，不是精确阅读人数。脚本被拦截、JavaScript 关闭、采集配置变化和 Umami 套餐保留窗口都会改变它。首页排序可以接受这个近似值，账务或计费不能。

## 最终建议

保留 Umami 作为唯一流量采集系统，删除本项目的逐访问 pageview 采集链路。新增一个很薄的同步模块即可：每日定时拉最近 30 个完整自然日的 `/metrics/expanded?type=path`，映射 Published Post，并原子替换 `postId -> score` 快照。

这比 Webhook 方案少一个实时投递系统，也比逐日增量少一套补数和幂等逻辑。对首页热门排序，一天延迟是合理代价。
