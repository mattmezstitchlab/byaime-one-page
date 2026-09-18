-- Le Profil qui naît rempli : la contrepartie rattache ses Moments attestés à sa Carte.
-- Aucune adresse n'est déduite d'un contact ; l'organisateur la confirme, le compte la vérifie.
BEGIN;
ALTER TABLE aime_attestation_links ADD COLUMN IF NOT EXISTS claim_email text;
ALTER TABLE aime_attestation_links ADD COLUMN IF NOT EXISTS claimed_card_user_id text REFERENCES aime_universal_cards(user_id) ON DELETE SET NULL;
ALTER TABLE aime_attestation_links ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
CREATE INDEX IF NOT EXISTS aime_attestation_links_claimed_card ON aime_attestation_links(claimed_card_user_id);
COMMIT;
