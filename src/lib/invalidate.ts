import { isNotInProduction, serverEnv } from "@/lib/env/server.env";

interface PurgeOptions {
  urls?: Array<string>; // 精确匹配的URL
  prefixes?: Array<string>; // 前缀匹配的URL
}

interface CloudflareApiMessage {
  code?: number;
  message?: string;
}

// Cloudflare purge response envelope:
// https://developers.cloudflare.com/api/resources/cache/subresources/cache/methods/purge/
interface CloudflarePurgeResponse {
  success?: boolean;
  errors?: Array<CloudflareApiMessage>;
}

export async function purgeCDNCache(env: Env, options: PurgeOptions) {
  const { CLOUDFLARE_ZONE_ID, CLOUDFLARE_PURGE_API_TOKEN, DOMAIN, CDN_DOMAIN } =
    serverEnv(env);

  if (isNotInProduction(env)) {
    console.log(
      JSON.stringify({ message: "cdn cache purge skipped in development" }),
    );
    return;
  }

  const domain = CDN_DOMAIN ?? DOMAIN;
  const baseUrl = `https://${domain}`;

  const payload: { files?: Array<string>; prefixes?: Array<string> } = {};

  if (options.urls && options.urls.length > 0) {
    payload.files = options.urls.flatMap((path) => {
      const fullPath = `${baseUrl}${path.startsWith("/") ? path : "/" + path}`;
      if (path === "/" || path === "") return [`${baseUrl}/`];
      return [fullPath, `${fullPath}/`];
    });
  }

  if (options.prefixes && options.prefixes.length > 0) {
    // Cloudflare prefix purge doesn't want URI scheme (https://)
    payload.prefixes = options.prefixes.map((path) => {
      const cleanPath = path.startsWith("/") ? path : `/${path}`;
      if (cleanPath === "/") {
        return domain;
      }
      return `${domain}${cleanPath}`;
    });
  }

  if (!payload.files && !payload.prefixes) return;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_PURGE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const responseText = await response.text();
  let responseData: CloudflarePurgeResponse | null = null;

  if (responseText) {
    try {
      responseData = JSON.parse(responseText) as CloudflarePurgeResponse;
    } catch {
      responseData = null;
    }
  }

  const apiErrorMessage =
    responseData?.errors
      ?.map((error) => error.message?.trim())
      .filter(Boolean)
      .join("; ") || responseText;

  if (!response.ok || responseData?.success === false) {
    console.error(
      JSON.stringify({
        message: "cloudflare purge api failed",
        status: response.status,
        error: apiErrorMessage,
        success: responseData?.success,
      }),
    );
    throw new Error(`Cloudflare Purge API failed: ${apiErrorMessage}`);
  }
}

export async function purgePostCDNCache(env: Env, slug: string) {
  return purgeCDNCache(env, {
    urls: [
      `/post/${slug}`, // 页面
      `/api/post/${slug}`, // 单篇 API（单数）
      `/api/post/${slug}/related`, // 相关文章 API
      `/api/tags`, // 标签 API
      "/",
    ],
    prefixes: [
      "/posts", // 列表页面
      "/api/posts", // 列表 API（复数）
      "/search", // 搜索页面
      "/api/search", // 搜索 API
    ],
  });
}

export async function purgeSiteCDNCache(env: Env) {
  return purgeCDNCache(env, {
    prefixes: ["/"],
  });
}
