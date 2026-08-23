UPDATE `comments`
SET `status` = 'published'
WHERE `status` IN ('pending', 'verifying');

ALTER TABLE `comments` DROP COLUMN `ai_reason`;
