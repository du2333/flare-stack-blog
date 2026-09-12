-- Applicant notifications now resolve user.email via friend_links.user_id.
-- Admin-created links have no applicant and receive no applicant notification.
ALTER TABLE friend_links DROP COLUMN contact_email;
