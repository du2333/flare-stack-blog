# Webhook 推送

博客收到新评论、有人回复管理员、有人提交友链申请时，除了邮件，还可以把通知推送到一个地方。在后台「设置 → 通知 → Webhook 推送」里选择推送渠道并填写对应信息，点「发送测试」确认能收到，再保存。推送目标只有一个，留空则不推送。

| 渠道 | 需要填写 |
| --- | --- |
| Telegram | Bot Token 和 Chat ID。给 bot 发一条消息或把它拉进群后，点「查找」可以直接选择对话 |
| Discord、飞书、钉钉、企业微信 | 群机器人的 Webhook 地址。飞书和钉钉如果开启「自定义关键词」，填写「博客通知」 |
| Bark | App 首页的推送地址，例如 `https://api.day.app/你的Key` |
| ntfy | 主题地址，例如 `https://ntfy.sh/你的主题` |
| 通用 JSON（签名） | 接收地址和签名密钥，适合自己编写的接收服务，例如 n8n、自建脚本或 Worker |
| 自定义 | 接收地址和请求体模板，签名密钥可选 |

测试失败时，提示里会带上对方服务返回的原因，例如钉钉的 `keywords not in content` 或 Telegram 的 `chat not found`。

## 通用 JSON

每次推送是一个 `POST` 请求，请求体是 JSON：

```json
{
  "id": "3c1f0d6e-…",
  "type": "comment.admin_root_created",
  "timestamp": "2026-10-14T08:00:00.000Z",
  "test": false,
  "data": {
    "postTitle": "欢迎来到我的博客",
    "commenterName": "张三",
    "commentPreview": "写得真好",
    "commentUrl": "https://example.com/post/welcome?comment=12"
  },
  "message": "张三 在《欢迎来到我的博客》下发表了评论：写得真好 https://example.com/post/welcome?comment=12"
}
```

`message` 是已经按站点语言写好的一句话，只想转发通知的话直接用它即可。`test` 为 `true` 表示这是后台「发送测试」发出的示例。`type` 和 `data` 中的字段如下：

| `type` | 触发时机 | `data` 字段 |
| --- | --- | --- |
| `comment.admin_root_created` | 文章下有新的评论 | `postTitle`、`commenterName`、`commentPreview`、`commentUrl` |
| `comment.reply_to_admin_published` | 有人回复了管理员的评论 | `postTitle`、`replierName`、`replyPreview`、`commentUrl` |
| `friend_link.submitted` | 有人提交了友链申请 | `siteName`、`siteUrl`、`description`、`submitterName`、`reviewUrl` |

接收服务返回 2xx 即视为送达。返回其他状态码或超过 10 秒未响应时会重试，最多再试 3 次。重试时 `id` 不变，可以用它去重。

### 校验签名

请求带有三个请求头：

| 请求头 | 内容 |
| --- | --- |
| `X-Flare-Event` | 与 `type` 相同 |
| `X-Flare-Timestamp` | 与 `timestamp` 相同 |
| `X-Flare-Signature` | `sha256=` 加上签名的十六进制 |

签名是用设置里的签名密钥，对「`X-Flare-Timestamp` 的值 + `.` + 原始请求体」计算 HMAC-SHA256，再转成小写十六进制。校验时必须使用收到的原始请求体字符串，不要先解析 JSON 再重新序列化，否则字段顺序或空白不同就会对不上。可以再检查时间戳是否在几分钟之内，拒绝过旧的请求。

以 Cloudflare Worker 为例：

```js
export default {
  async fetch(request, env) {
    const body = await request.text();
    const timestamp = request.headers.get("X-Flare-Timestamp") ?? "";
    const signature = request.headers.get("X-Flare-Signature") ?? "";

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(env.FLARE_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const hex = signature.replace(/^sha256=/, "");
    const bytes = new Uint8Array(hex.match(/../g)?.map((h) => parseInt(h, 16)) ?? []);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      bytes,
      new TextEncoder().encode(`${timestamp}.${body}`),
    );
    const fresh = Math.abs(Date.now() - Date.parse(timestamp)) < 5 * 60 * 1000;
    if (!valid || !fresh) return new Response("invalid signature", { status: 401 });

    const event = JSON.parse(body);
    // 按 event.type 处理通知……
    return new Response("ok");
  },
};
```

n8n 等工具可以用自带的 HMAC 功能，按同样的规则对原始请求体计算签名后比较。

## 自定义模板

自定义渠道会把请求体模板里的变量替换后发出。模板是合法 JSON 时按 `application/json` 发送，变量值会自动转义；否则按纯文本发送。可用变量：

| 变量 | 内容 |
| --- | --- |
| `{{title}}` | 简短标题，例如「博客通知 · 新评论」 |
| `{{message}}` | 与通用 JSON 的 `message` 相同 |
| `{{url}}` | 评论链接，或友链申请的审核页面 |
| `{{type}}`、`{{timestamp}}` | 与通用 JSON 相同 |
| `{{data.字段名}}` | `data` 中的任一字段，例如 `{{data.postTitle}}` |

从其他渠道切换到「自定义」时，会自动填入那个渠道原本使用的地址和模板，可以在它的基础上修改。填写签名密钥后，请求同样会带上上面的三个签名请求头。
