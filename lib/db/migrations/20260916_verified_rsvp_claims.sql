-- No claims or recipient addresses are inferred from historical names/contacts.
BEGIN;
ALTER TABLE aime_memberships ADD COLUMN IF NOT EXISTS participant_only boolean NOT NULL DEFAULT false;
ALTER TABLE aime_rsvps ADD COLUMN IF NOT EXISTS claim_email text;
ALTER TABLE aime_rsvps ADD COLUMN IF NOT EXISTS claimed_card_user_id text REFERENCES aime_universal_cards(user_id) ON DELETE SET NULL;
ALTER TABLE aime_rsvps ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS aime_rsvp_project_card ON aime_rsvps(project_id, claimed_card_user_id);
COMMIT;
