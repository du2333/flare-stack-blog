import { orpc } from "@/lib/orpc";

export const systemConfigQuery = orpc.config.admin.get.queryOptions();

export const siteConfigQuery = orpc.config.siteConfig.queryOptions();

export const siteDomainQuery = orpc.config.siteDomain.queryOptions();
