-- A Comment belongs to a Post or a Moment (ADR 0037), exactly one of them:
-- `post_id` becomes nullable, `moment_id` references the Moment, deleted with
-- it as a Post's Comments are, and a CHECK holds every row to one target.
-- SQLite cannot change a column's nullability or add a CHECK in place, so the
-- table is rebuilt as migration 0005 rebuilt it, keeping every id, row and
-- index; every existing Comment stays on its Post.
PRAGMA defer_foreign_keys=ON;
--> statement-breakpoint
CREATE TABLE `__new_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text,
	`root_id` integer,
	`reply_to_comment_id` integer,
	`status` text DEFAULT 'published' NOT NULL,
	`post_id` integer,
	`moment_id` integer,
	`user_id` text,
	`handled_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`root_id`) REFERENCES `__new_comments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reply_to_comment_id`) REFERENCES `__new_comments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`moment_id`) REFERENCES `moments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT `comments_one_target` CHECK ((`post_id` IS NULL) <> (`moment_id` IS NULL))
);
--> statement-breakpoint
INSERT INTO `__new_comments`("id", "content", "root_id", "reply_to_comment_id", "status", "post_id", "moment_id", "user_id", "handled_at", "created_at", "updated_at") SELECT "id", "content", "root_id", "reply_to_comment_id", "status", "post_id", NULL, "user_id", "handled_at", "created_at", "updated_at" FROM `comments`;
--> statement-breakpoint
DROP TABLE `comments`;
--> statement-breakpoint
ALTER TABLE `__new_comments` RENAME TO `comments`;
--> statement-breakpoint
PRAGMA defer_foreign_keys=OFF;
--> statement-breakpoint
CREATE INDEX `comments_post_root_created_idx` ON `comments` (`post_id`,`root_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `comments_moment_root_created_idx` ON `comments` (`moment_id`,`root_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `comments_user_created_idx` ON `comments` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `comments_status_created_idx` ON `comments` (`status`,`created_at`);
--> statement-breakpoint
CREATE INDEX `comments_global_created_idx` ON `comments` (`created_at`);
