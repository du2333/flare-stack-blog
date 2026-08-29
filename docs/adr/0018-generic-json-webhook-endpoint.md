# Webhook Endpoint delivers generic JSON

A Webhook Endpoint is one URL in System Config that receives admin Notification Events as JSON: `id`, `type`, `timestamp`, `test`, `data`, and a plain-text `message`. That payload is the event, not a copy of the email and not an adapter for Discord, Slack, or similar. The request is always HMAC-signed; the consumer decides whether to verify. There is no per-event subscription and no list of endpoints.
