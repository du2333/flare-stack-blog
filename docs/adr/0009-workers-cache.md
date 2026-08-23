# Cache public pages with Workers Caching

Public HTML and site documents are stored by Workers Caching (`cache.enabled` on the `App` entrypoint). The default fetch handler only resolves locale into `ctx.props` and forwards the request, so the same URL can keep Chinese and English copies without putting locale in the path. Invalidation uses `cache.purge` with `Cache-Tag` values from the same `invalidate.*` paths that bump KV **Public Cache**; a failed purge fails the mutation. Zone purge and the Cache API are not used. Admin reset calls `purgeEverything`.
