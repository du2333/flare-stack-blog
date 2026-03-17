CREATE TABLE `post_revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`reason` text DEFAULT 'auto' NOT NULL,
	`snapshot_json` text NOT NULL,
	`snapshot_hash` text NOT NULL,
	`restored_from_revision_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `post_revisions_post_created_idx` ON `post_revisions` (`post_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `post_revisions_post_hash_idx` ON `post_revisions` (`post_id`,`snapshot_hash`);