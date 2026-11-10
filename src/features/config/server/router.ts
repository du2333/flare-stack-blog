import { lazy } from "@orpc/server";
import * as ConfigService from "@/features/config/service/config.service";
import { serverEnv } from "@/lib/env/server.env";
import { publicProcedure } from "@/lib/orpc/procedure";

const siteConfig = publicProcedure
  .route({
    method: "GET",
    path: "/site/config",
    summary: "Get public site config",
    description:
      "Returns the resolved Site Config: identity, social and navigation links, icons, the personalization every Theme honours (bannerImage, bannerFocus, avatar, primaryHue, brandMark, tagline) and the selected Theme with its options. A saved Theme id this version does not offer is returned as the default Theme. theme.fuwari is a deprecated copy of bannerImage, avatar and primaryHue kept for older versions.",
    tags: ["Site"],
  })
  .handler(({ context }) => ConfigService.getSiteConfig(context));

const siteDomain = publicProcedure
  .route({
    method: "GET",
    path: "/site/domain",
    summary: "Get the public site domain",
    tags: ["Site"],
  })
  .handler(({ context }) => serverEnv(context.env).DOMAIN);

export default {
  siteConfig,
  siteDomain,
  // Loaded on the first request under the prefix; public calls never load it.
  admin: lazy(() => import("./admin-router"), { prefix: "/admin/config" }),
};
