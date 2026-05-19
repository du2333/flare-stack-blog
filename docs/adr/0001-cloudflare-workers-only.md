# Cloudflare Workers as the only deployment target

Flare Stack Blog is designed for Cloudflare Workers as its only supported deployment target, and its architecture intentionally uses Cloudflare-native services such as D1, R2, KV, Workflows, Queues, Workers AI, and edge image handling. Do not add Node/Vercel portability abstractions unless this decision is explicitly reopened, because portability would weaken the Cloudflare-native design that the project optimizes for.
