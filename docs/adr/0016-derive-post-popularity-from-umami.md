# Derive Post Popularity from Umami

Umami is the only traffic collection and analytics system. A daily Cloudflare Cron Trigger pulls path metrics for the previous 30 complete UTC days, maps current public Post slugs, and replaces one Post Popularity Snapshot in KV. The application stores no raw visitor events or visitor identifiers. The homepage uses only positive scores and falls back to pinned and recent Posts when the snapshot is missing or older than seven days. This avoids maintaining a second analytics system solely for popular-Post ordering.
