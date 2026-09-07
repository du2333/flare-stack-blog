CREATE TABLE `search_documents` (
	`post_id` integer PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`content` text NOT NULL,
	`tags` text NOT NULL,
	`tokens` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `search_index_meta` (
	`id` integer PRIMARY KEY NOT NULL,
	`version` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `search_index_meta` (`id`, `version`) VALUES (1, '0');
--> statement-breakpoint
CREATE VIRTUAL TABLE `search_documents_fts` USING fts5(
	tokens,
	content='search_documents',
	content_rowid='post_id',
	tokenize='unicode61'
);
--> statement-breakpoint
CREATE TRIGGER `search_documents_ai` AFTER INSERT ON `search_documents` BEGIN
	INSERT INTO search_documents_fts(rowid, tokens) VALUES (NEW.post_id, NEW.tokens);
END;
--> statement-breakpoint
CREATE TRIGGER `search_documents_ad` AFTER DELETE ON `search_documents` BEGIN
	INSERT INTO search_documents_fts(search_documents_fts, rowid, tokens) VALUES('delete', OLD.post_id, OLD.tokens);
END;
--> statement-breakpoint
CREATE TRIGGER `search_documents_au` AFTER UPDATE ON `search_documents` BEGIN
	INSERT INTO search_documents_fts(search_documents_fts, rowid, tokens) VALUES('delete', OLD.post_id, OLD.tokens);
	INSERT INTO search_documents_fts(rowid, tokens) VALUES (NEW.post_id, NEW.tokens);
END;
