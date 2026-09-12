# Friend Link applications use account email and a status-focused page

Status: Accepted

## Decision

A user-submitted Friend Link already belongs to its User. Review notifications resolve that User's current email at review time. Remove the independent contact email from storage, public/admin input schemas, responses, and both forms. Admin-created listings have no applicant and receive no applicant notification. Account email remains server-only and is not added to public user summaries.

The application page focuses on one site: a four-field form before submission, then pending, approved, or rejected status. Rejected applications can be revised in place by their owner through the optional submission `id`. The update checks ownership and rejected status atomically; stale/concurrent retries return a conflict. Existing multiple applications remain accessible through a compact site selector. This UI does not impose a database uniqueness constraint per User.

## Consequences

Apply migration `0021_friend_link_account_email.sql` before deploying this code. It drops the obsolete email column, preserving listing IDs, User associations and moderation state. Historical manually entered contact addresses are intentionally removed and are not copied into account data. Historical migrations remain unchanged.

The approved-list cache key changes so old payloads are not reused. OpenAPI is the API contract: `POST /friend-links` accepts the optional owned rejected ID, and contact-email properties no longer appear in its or admin schemas. New submissions without an ID remain supported; no one-site-per-user restriction is introduced in the API.
