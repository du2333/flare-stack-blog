-- Add uploader_id and status columns to guitar_tab_metadata
ALTER TABLE guitar_tab_metadata ADD COLUMN uploader_id TEXT REFERENCES user(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE guitar_tab_metadata ADD COLUMN status TEXT NOT NULL DEFAULT 'approved';
