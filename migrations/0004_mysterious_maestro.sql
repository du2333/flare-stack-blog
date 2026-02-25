CREATE TABLE `guitar_tab_metadata` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`media_id` integer NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`artist` text DEFAULT '' NOT NULL,
	`album` text DEFAULT '' NOT NULL,
	`tempo` integer DEFAULT 120 NOT NULL,
	`track_count` integer DEFAULT 0 NOT NULL,
	`track_names` text DEFAULT '[]' NOT NULL,
	`cover_media_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cover_media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guitar_tab_metadata_media_id_unique` ON `guitar_tab_metadata` (`media_id`);
--> statement-breakpoint
CREATE INDEX `guitar_tab_metadata_artist_idx` ON `guitar_tab_metadata` (`artist`);
