# Stop purging the Cloudflare zone cache

Publish, tag, and site-config paths no longer call the Cloudflare purge API, and `CLOUDFLARE_PURGE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`, and `CDN_DOMAIN` leave the runtime. KV **Public Cache** stays. Public HTML keeps its existing cache headers, including `CDN-Cache-Control`; without Cache API or Workers Cache (`cache.enabled`) those edge directives do not skip the Worker, and this change does not turn Workers Cache on. JSON API responses will not send cache headers. Image cache headers stay. The Admin maintenance action only bumps KV **Public Cache**.
