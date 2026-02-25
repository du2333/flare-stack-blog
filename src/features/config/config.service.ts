import type { SystemConfig } from "@/features/config/config.schema";
import * as CacheService from "@/features/cache/cache.service";
import * as ConfigRepo from "@/features/config/config.data";
import {
  CONFIG_CACHE_KEYS,
  SystemConfigSchema,
} from "@/features/config/config.schema";
import { serverEnv } from "@/lib/env/server.env";
import { PostsTable } from "@/lib/db/schema";
import { and, desc, eq, lte } from "drizzle-orm";
import * as GuitarTabMetaRepo from "@/features/media/data/guitar-tab-metadata.data";

export async function getSystemConfig(
  context: DbContext & { executionCtx: ExecutionContext },
) {
  return await CacheService.get(
    context,
    CONFIG_CACHE_KEYS.system,
    SystemConfigSchema.nullable(),
    async () => await ConfigRepo.getSystemConfig(context.db),
  );
}

export async function updateSystemConfig(
  context: DbContext,
  data: SystemConfig,
) {
  await ConfigRepo.upsertSystemConfig(context.db, data);
  await CacheService.deleteKey(
    context,
    CONFIG_CACHE_KEYS.system,
    CONFIG_CACHE_KEYS.isEmailConfigured,
  );

  return { success: true };
}

/**
 * 批量提交 URL 到搜索引擎
 * 返回每个 URL 每个引擎的提交结果
 */
export async function submitUrlsToSearchEngines(
  context: DbContext & { executionCtx: ExecutionContext },
  urls: string[],
): Promise<{
  google?: { success: boolean; message: string };
  bing?: { success: boolean; message: string };
  baidu?: { success: boolean; message: string };
  submittedUrls: string[];
}> {
  const config = await getSystemConfig(context);
  const { DOMAIN } = serverEnv(context.env);
  const siteUrl = `https://${DOMAIN}`;
  const results: {
    google?: { success: boolean; message: string };
    bing?: { success: boolean; message: string };
    baidu?: { success: boolean; message: string };
    submittedUrls: string[];
  } = { submittedUrls: urls };

  // ── Bing URL Submission ──
  if (config?.seo?.bingApiKey) {
    try {
      const resp = await fetch(
        `https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch?apikey=${config.seo.bingApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteUrl,
            urlList: urls,
          }),
        },
      );
      if (resp.ok) {
        results.bing = { success: true, message: `已提交 ${urls.length} 个 URL` };
      } else {
        const text = await resp.text();
        results.bing = { success: false, message: `HTTP ${resp.status}: ${text.slice(0, 100)}` };
      }
    } catch (err) {
      results.bing = {
        success: false,
        message: err instanceof Error ? err.message : "请求失败",
      };
    }
  }

  // ── 百度 URL 推送 ──
  if (config?.seo?.baiduPushToken) {
    try {
      const resp = await fetch(
        `http://data.zz.baidu.com/urls?site=${siteUrl}&token=${config.seo.baiduPushToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: urls.join("\n"),
        },
      );
      const data = await resp.json() as { success?: number; remain?: number; error?: number; message?: string };
      if (data.success !== undefined) {
        results.baidu = {
          success: true,
          message: `成功推送 ${data.success} 条，今日剩余配额 ${data.remain ?? "未知"}`,
        };
      } else {
        results.baidu = {
          success: false,
          message: data.message || `错误码 ${data.error ?? "未知"}`,
        };
      }
    } catch (err) {
      results.baidu = {
        success: false,
        message: err instanceof Error ? err.message : "请求失败",
      };
    }
  }

  // ── Google Indexing API ──
  if (config?.seo?.googleIndexingKey) {
    try {
      // 解析 Base64 编码的 Service Account Key
      const keyJson = JSON.parse(atob(config.seo.googleIndexingKey)) as {
        client_email: string;
        private_key: string;
      };

      // 生成 JWT Token
      const token = await generateGoogleJwt(keyJson.client_email, keyJson.private_key);

      // 逐个提交 URL（Google Indexing API 不支持批量）
      let successCount = 0;
      let lastError = "";
      for (const url of urls.slice(0, 10)) {
        // 限制最多 10 个 URL
        try {
          const resp = await fetch(
            "https://indexing.googleapis.com/v3/urlNotifications:publish",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                url,
                type: "URL_UPDATED",
              }),
            },
          );
          if (resp.ok) {
            successCount++;
          } else {
            const text = await resp.text();
            lastError = `HTTP ${resp.status}: ${text.slice(0, 80)}`;
          }
        } catch (err) {
          lastError = err instanceof Error ? err.message : "请求失败";
        }
      }

      results.google = {
        success: successCount > 0,
        message: successCount > 0
          ? `已提交 ${successCount}/${Math.min(urls.length, 10)} 个 URL`
          : lastError || "全部失败",
      };
    } catch (err) {
      results.google = {
        success: false,
        message: `Key 解析失败: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  return results;
}

/**
 * 生成 Google OAuth2 JWT Token
 * 用于 Indexing API 认证
 */
async function generateGoogleJwt(
  clientEmail: string,
  privateKeyPem: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/indexing",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "");
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // 导入 RSA 私钥
  const pemContents = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\n/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(unsignedToken),
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "");
  const jwt = `${unsignedToken}.${signatureB64}`;

  // 交换 JWT → Access Token
  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResp.json() as { access_token?: string; error?: string };
  if (!tokenData.access_token) {
    throw new Error(tokenData.error || "无法获取 Google Access Token");
  }

  return tokenData.access_token;
}

/**
 * 获取网站所有可索引的 URL 列表
 * 用于站长工具自动生成 URL 列表
 */
export async function getSiteUrls(
  context: DbContext & { executionCtx: ExecutionContext },
): Promise<Array<{ url: string; type: string; title: string; updatedAt: Date | null }>> {
  const { DOMAIN } = serverEnv(context.env);
  const baseUrl = `https://${DOMAIN}`;
  const urls: Array<{ url: string; type: string; title: string; updatedAt: Date | null }> = [];

  // 1. 静态页面
  urls.push(
    { url: `${baseUrl}/`, type: "page", title: "首页", updatedAt: null },
    { url: `${baseUrl}/posts`, type: "page", title: "文章列表", updatedAt: null },
    { url: `${baseUrl}/guitar-tabs`, type: "page", title: "吉他谱列表", updatedAt: null },
  );

  // 2. 已发布文章
  const posts = await context.db
    .select({
      slug: PostsTable.slug,
      title: PostsTable.title,
      updatedAt: PostsTable.updatedAt,
    })
    .from(PostsTable)
    .where(
      and(
        eq(PostsTable.status, "published"),
        lte(PostsTable.publishedAt, new Date()),
      ),
    )
    .orderBy(desc(PostsTable.updatedAt))
    .limit(500);

  for (const post of posts) {
    urls.push({
      url: `${baseUrl}/post/${encodeURIComponent(post.slug)}`,
      type: "post",
      title: post.title,
      updatedAt: post.updatedAt,
    });
  }

  // 3. 已通过审核的吉他谱
  const guitarTabs = await GuitarTabMetaRepo.getAllApprovedTabUrls(context.db);
  for (const tab of guitarTabs) {
    urls.push({
      url: `${baseUrl}/guitar-tab/${encodeURIComponent(tab.slug)}`,
      type: "guitar-tab",
      title: `${tab.title || "未命名"}${tab.artist ? ` — ${tab.artist}` : ""}`,
      updatedAt: tab.updatedAt,
    });
  }

  return urls;
}
