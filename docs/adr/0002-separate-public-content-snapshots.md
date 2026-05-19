# Separate public content snapshots from editable post content

Published posts keep a Public Content Snapshot separate from editable post content so the public site reads processed, stable content while admins continue editing drafts and updates. This adds synchronization and invalidation work, but it protects public rendering, search, and cache behavior from half-processed editor state and makes post-processing steps explicit at publish time.
