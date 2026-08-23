# Use Queues for async delivery work

Flare Stack Blog uses Queues for delivery or ingestion work that benefits from batching and retry, such as email, webhooks, and pageviews. Publishing a Post does not use a queue for that write path. Creating a Comment does not wait on a queue: the Comment is public immediately, and reply notifications go on the Queue. The same publish request writes the Post Revision, highlights code into the Public Content Snapshot, updates the Search Index, and updates the Public Cache. That sequence is idempotent: if any step fails, the Admin publishes again.
