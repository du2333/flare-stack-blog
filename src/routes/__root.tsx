import { TanStackDevtools } from "@tanstack/react-devtools";
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/common/theme-provider";

import TanStackQueryDevtools from "@/integrations/tanstack-query/devtools";
import appCss from "@/styles.css?url";
import { blogConfig } from "@/blog.config";
import { clientEnv } from "@/lib/env/client.env";
import { getSeoVerificationFn } from "@/features/config/config.api";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  loader: async () => {
    // SSR 侧获取 SEO 验证码
    try {
      const seoVerification = await getSeoVerificationFn();
      return { seoVerification };
    } catch {
      return { seoVerification: null };
    }
  },
  head: ({ loaderData }) => {
    const env = clientEnv();
    const seo = loaderData?.seoVerification;

    // 构建 SEO 验证 meta tags
    const seoMeta: Array<Record<string, string>> = [];
    if (seo?.googleVerification) {
      seoMeta.push({
        name: "google-site-verification",
        content: seo.googleVerification,
      });
    }
    if (seo?.bingVerification) {
      seoMeta.push({
        name: "msvalidate.01",
        content: seo.bingVerification,
      });
    }
    if (seo?.baiduVerification) {
      seoMeta.push({
        name: "baidu-site-verification",
        content: seo.baiduVerification,
      });
    }

    return {
      meta: [
        {
          charSet: "utf-8",
        },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
        {
          title: blogConfig.title,
        },
        {
          name: "description",
          content: blogConfig.description,
        },
        ...seoMeta,
      ],
      links: [
        {
          rel: "icon",
          type: "image/svg+xml",
          href: "/favicon.svg",
        },
        {
          rel: "icon",
          type: "image/png",
          href: "/favicon-96x96.png",
          sizes: "96x96",
        },
        {
          rel: "shortcut icon",
          href: "/favicon.ico",
        },
        {
          rel: "apple-touch-icon",
          type: "image/png",
          href: "/apple-touch-icon.png",
          sizes: "180x180",
        },
        {
          rel: "manifest",
          href: "/site.webmanifest",
        },
        {
          rel: "stylesheet",
          href: appCss,
        },
        {
          rel: "alternate",
          type: "application/rss+xml",
          title: "RSS Feed",
          href: "/rss.xml",
        },
      ],
      scripts: env.VITE_UMAMI_WEBSITE_ID
        ? [
            {
              src: "/stats.js",
              defer: true,
              "data-website-id": env.VITE_UMAMI_WEBSITE_ID,
            },
          ]
        : [],
    };
  },
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
