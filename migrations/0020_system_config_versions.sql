-- Refuse ambiguous legacy data rather than choosing and discarding a row.
CREATE TABLE `system_config_migration_guard` (`rows` integer NOT NULL CHECK (`rows` <= 1));
--> statement-breakpoint
INSERT INTO `system_config_migration_guard` SELECT count(*) FROM `system_config`;
--> statement-breakpoint
CREATE TABLE `system_config_next` (
  `id` integer PRIMARY KEY NOT NULL DEFAULT 1 CHECK (`id` = 1),
  `config_json` text NOT NULL CHECK (json_valid(`config_json`)),
  `site_revision` integer NOT NULL DEFAULT 0 CHECK (`site_revision` >= 0),
  `notification_revision` integer NOT NULL DEFAULT 0 CHECK (`notification_revision` >= 0),
  `updated_at` integer NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
INSERT INTO `system_config_next` (`id`, `config_json`, `updated_at`)
SELECT 1, coalesce(`config_json`, '{}'), `updated_at` FROM `system_config`;
--> statement-breakpoint
DROP TABLE `system_config`;
--> statement-breakpoint
ALTER TABLE `system_config_next` RENAME TO `system_config`;
--> statement-breakpoint
DROP TABLE `system_config_migration_guard`;
