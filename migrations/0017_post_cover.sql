ALTER TABLE `posts` ADD `cover_media_id` integer REFERENCES media(id) ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX `posts_cover_media_id_idx` ON `posts` (`cover_media_id`);
