ALTER TABLE `posts` ADD `public_snapshot_json` text;
ALTER TABLE `posts` ADD `public_slug` text;
CREATE UNIQUE INDEX `posts_public_slug_unique` ON `posts` (`public_slug`);

UPDATE `posts`
SET
  `public_slug` = `slug`,
  `public_snapshot_json` = json_object(
    'title', `title`,
    'summary', `summary`,
    'slug', `slug`,
    'contentJson', json(COALESCE(`public_content_json`, `content_json`, 'null')),
    'tagIds', json(COALESCE((
      SELECT json_group_array(`tag_id`) FROM `post_tags` WHERE `post_id` = `posts`.`id`
    ), '[]')),
    'publishedAt', strftime('%Y-%m-%dT%H:%M:%S.000Z', COALESCE(`published_at`, `created_at`), 'unixepoch'),
    'pinnedAt', CASE
      WHEN `pinned_at` IS NULL THEN NULL
      ELSE strftime('%Y-%m-%dT%H:%M:%S.000Z', `pinned_at`, 'unixepoch')
    END
  )
WHERE `status` = 'published';

ALTER TABLE `posts` DROP COLUMN `public_content_json`;
ALTER TABLE `posts` DROP COLUMN `read_time_in_minutes`;
