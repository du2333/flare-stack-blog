# Stop purging the Cloudflare zone cache

Publish, tag, and site-config paths no longer call the Cloudflare purge API, and `CLOUDFLARE_PURGE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`, and `CDN_DOMAIN` leave the runtime. KV **Public Cache** stays. JSON API responses will not send cache headers. Image cache headers stay.

Superseded in part by ADR 0009: Workers Caching is now on, and the Admin maintenance action also purges that cache.
