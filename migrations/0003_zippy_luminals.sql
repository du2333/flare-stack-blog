CREATE TABLE `friend_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_name` text NOT NULL,
	`site_url` text NOT NULL,
	`description` text,
	`logo_url` text,
	`contact_email` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`rejection_reason` text,
	`user_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `friend_links_status_created_idx` ON `friend_links` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `friend_links_user_idx` ON `friend_links` (`user_id`);