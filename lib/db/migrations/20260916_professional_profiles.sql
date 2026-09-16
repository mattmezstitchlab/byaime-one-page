-- Apply after 20260916_universal_cards.sql. Transactional, lossless extraction.
BEGIN;
CREATE TABLE IF NOT EXISTS aime_professional_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_user_id text NOT NULL REFERENCES aime_universal_cards(user_id) ON DELETE CASCADE,
  profession text NOT NULL,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS aime_profile_card_profession ON aime_professional_profiles(card_user_id, profession);
CREATE UNIQUE INDEX IF NOT EXISTS aime_profile_id_user ON aime_professional_profiles(id, card_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS aime_membership_id_user ON aime_memberships(id, user_id);
CREATE TABLE IF NOT EXISTS aime_professional_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid NOT NULL,
  user_id text NOT NULL,
  profile_id uuid NOT NULL,
  data jsonb NOT NULL,
  CONSTRAINT aime_assignment_member_owner FOREIGN KEY (membership_id, user_id) REFERENCES aime_memberships(id,user_id) ON DELETE CASCADE,
  CONSTRAINT aime_assignment_profile_owner FOREIGN KEY (profile_id,user_id) REFERENCES aime_professional_profiles(id,card_user_id) ON DELETE CASCADE
);
-- Refuse unsupported legacy shapes rather than discarding data during extraction.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM aime_universal_cards WHERE data ? 'professional' AND jsonb_typeof(data->'professional') IS DISTINCT FROM 'object') THEN
    RAISE EXCEPTION 'Unsupported legacy professional data: manual review required';
  END IF;
  IF EXISTS (
    SELECT 1 FROM aime_universal_cards c
    CROSS JOIN LATERAL jsonb_each(COALESCE(c.data->'professional','{}'::jsonb)) p
    WHERE jsonb_typeof(p.value) IS DISTINCT FROM 'object'
  ) THEN RAISE EXCEPTION 'Unsupported legacy professional profile: manual review required'; END IF;
  IF EXISTS (
    SELECT 1 FROM aime_universal_cards c
    CROSS JOIN LATERAL jsonb_each(COALESCE(c.data->'professional','{}'::jsonb)) p
    CROSS JOIN LATERAL jsonb_each(p.value) f
    WHERE jsonb_typeof(f.value) IS DISTINCT FROM 'string'
  ) THEN RAISE EXCEPTION 'Unsupported legacy professional field: manual review required'; END IF;
END $$;
-- Keep legacy strings verbatim. A string like "30 minutes" is NOT a typed duration.
INSERT INTO aime_professional_profiles(card_user_id, profession, data)
SELECT c.user_id, p.key, jsonb_build_object(
  'parameters', '{}'::jsonb,
  'availability', '{"timezone":"Europe/Paris","weekly":[],"windows":[],"unavailable":[]}'::jsonb,
  'coveredMoments', '[]'::jsonb,
  'legacyNotes', p.value
)
FROM aime_universal_cards c
CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(c.data->'professional') = 'object' THEN c.data->'professional' ELSE '{}'::jsonb END) p
ON CONFLICT (card_user_id, profession) DO UPDATE
SET data = jsonb_set(aime_professional_profiles.data, '{legacyNotes}', EXCLUDED.data->'legacyNotes' || COALESCE(aime_professional_profiles.data->'legacyNotes', '{}'::jsonb));
UPDATE aime_universal_cards SET data = data - 'professional', updated_at = now() WHERE data ? 'professional';
COMMIT;
