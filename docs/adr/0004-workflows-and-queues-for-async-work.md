# Use Workflows and Queues for different async work

Flare Stack Blog uses Cloudflare Workflows for durable business processes that need ordered, recoverable steps, such as post processing, scheduled publishing, comment moderation, and import/export tasks. It uses Queues for delivery or ingestion work that benefits from batching and retry, such as email, webhooks, pageviews, and snapshot messages; this keeps long-running domain processes explicit while keeping high-volume side effects off the request path.
