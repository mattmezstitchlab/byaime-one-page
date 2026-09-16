BEGIN;
CREATE TABLE IF NOT EXISTS aime_universal_cards (
  user_id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE aime_memberships ADD COLUMN IF NOT EXISTS card_user_id text REFERENCES aime_universal_cards(user_id) ON DELETE SET NULL;
ALTER TABLE aime_memberships ADD COLUMN IF NOT EXISTS participation jsonb;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aime_membership_own_card') THEN
    ALTER TABLE aime_memberships ADD CONSTRAINT aime_membership_own_card CHECK (card_user_id IS NULL OR card_user_id = user_id);
  END IF;
END $$;
COMMIT;
