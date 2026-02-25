ALTER TABLE `guitar_tab_metadata` ADD `file_hash` text;
ALTER TABLE `guitar_tab_metadata` ADD `slug` text;
CREATE INDEX `idx_guitar_tab_file_hash` ON `guitar_tab_metadata` (`file_hash`);
CREATE UNIQUE INDEX `guitar_tab_metadata_slug_unique` ON `guitar_tab_metadata` (`slug`);
