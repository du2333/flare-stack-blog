# Store the Search Index in D1 FTS, not Orama in KV

Publishing updates the **Search Index** in the same request as the **Public Content Snapshot**. Orama persisted the whole index to KV on every upsert (`save` + JSON + gzip), which blows the Workers Free 10ms CPU budget. The Search Index is now one D1 row per **Published Post** plus an FTS5 virtual table; a publish writes that row only. Chinese tokenization still uses `Intl.Segmenter`. FTS has no Orama-style fuzzy ranking. Drizzle has no first-class FTS API, so MATCH stays in a small SQL island behind SearchService.
