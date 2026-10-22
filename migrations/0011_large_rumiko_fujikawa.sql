CREATE TABLE `moments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text DEFAULT 'moment' NOT NULL,
	`content` text NOT NULL,
	`images` text DEFAULT '[]' NOT NULL,
	`location` text,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_moments_published` ON `moments` (`published_at`);--> statement-breakpoint
CREATE INDEX `idx_moments_type` ON `moments` (`type`);