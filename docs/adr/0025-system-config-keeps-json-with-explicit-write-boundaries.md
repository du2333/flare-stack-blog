# System Config keeps JSON with explicit write boundaries

System Config remains a singleton JSON document because its small, evolving presentation and delivery settings are read together and do not need relational queries. The database enforces singleton identity and stores separate Site Config and notification-delivery modification revisions; versioned section replacements preserve the other section and reject stale writes instead of accepting unversioned document replacement.

Configuration format evolution uses a payload `schemaVersion`, independently of modification revisions: legacy documents are normalized on read and written in the current format on the next update, while unsupported future formats cannot be overwritten. Management snapshots read the database directly and redact delivery secrets; secret updates explicitly keep, replace or clear values, and connection tests may reference a saved secret using its section revision. API Keys, delivery records and maintenance execution state remain separate entities.

This intentionally breaks old unversioned admin writes. Runtime configuration consumers retain their existing resolved shape, and a migration refuses ambiguous multirow legacy data rather than silently discarding it. Migration 0020 must precede the new application code. The generated OpenAPI specification owns the management and test-request contracts.
