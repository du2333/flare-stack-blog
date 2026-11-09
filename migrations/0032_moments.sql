-- Moments (ADR 0037): short untitled pieces kept apart from Posts. A Moment
-- holds its text and either a video (the attributes of a body video block, as
-- JSON) or its images, which are Media kept in order in `moment_images`, so
-- Media a Moment shows cannot be deleted. `save_token` is replaced by every
-- write so a save can refuse an Edit Conflict (ADR 0031); `posted_at` is when
-- it was first posted, which edits never change.
CREATE TABLE `moments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text DEFAULT '' NOT NULL,
	`video` text,
	`save_token` text NOT NULL,
	`posted_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `moments_posted_at_idx` ON `moments` (`posted_at`,`id`);
--> statement-breakpoint
CREATE TABLE `moment_images` (
	`moment_id` integer NOT NULL,
	`position` integer NOT NULL,
	`media_id` integer NOT NULL,
	PRIMARY KEY(`moment_id`, `position`),
	FOREIGN KEY (`moment_id`) REFERENCES `moments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `moment_images_media_idx` ON `moment_images` (`media_id`);
