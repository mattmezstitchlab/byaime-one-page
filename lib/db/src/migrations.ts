/*
 * Les migrations SQL, embarquées dans le code.
 *
 * Pourquoi un doublon de `lib/db/migrations/*.sql` : l'API applique elle-même
 * son schéma au démarrage (voir `ensure-schema.ts`), y compris sur Vercel où
 * seul le bundle est déployé — les fichiers `.sql` n'y sont pas. Les fichiers
 * restent la source lisible et rejouable à la main ; ce module en est la copie
 * exacte, et `migrations.test.ts` refuse toute divergence entre les deux.
 *
 * Ne rien écrire ici à la main : modifier le `.sql`, puis relancer
 * `corepack pnpm run db:sync-migrations`.
 */
export const MIGRATIONS: ReadonlyArray<{ name: string; sql: string }> = [
  {
    name: "20260916_universal_cards.sql",
    sql: String.raw`
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
`,
  },
  {
    name: "20260916_professional_profiles.sql",
    sql: String.raw`
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
`,
  },
  {
    name: "20260916_verified_rsvp_claims.sql",
    sql: String.raw`
-- No claims or recipient addresses are inferred from historical names/contacts.
BEGIN;
ALTER TABLE aime_memberships ADD COLUMN IF NOT EXISTS participant_only boolean NOT NULL DEFAULT false;
ALTER TABLE aime_rsvps ADD COLUMN IF NOT EXISTS claim_email text;
ALTER TABLE aime_rsvps ADD COLUMN IF NOT EXISTS claimed_card_user_id text REFERENCES aime_universal_cards(user_id) ON DELETE SET NULL;
ALTER TABLE aime_rsvps ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS aime_rsvp_project_card ON aime_rsvps(project_id, claimed_card_user_id);
COMMIT;
`,
  },
  {
    name: "20260918_attestations.sql",
    sql: String.raw`
-- Partie double : la contrepartie d'un Moment contresigne le fait tel qu'il lui est montré.
-- Les réponses sont append-only ; aucune écriture ne vient jamais du Monde lui-même.
BEGIN;
CREATE TABLE IF NOT EXISTS aime_attestation_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES aime_projects(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  provider_id text NOT NULL,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  revoked boolean NOT NULL DEFAULT false,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS aime_attestation_project_event_provider ON aime_attestation_links(project_id, event_id, provider_id);
CREATE TABLE IF NOT EXISTS aime_attestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES aime_attestation_links(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES aime_projects(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  provider_id text NOT NULL,
  status text NOT NULL,
  hash text NOT NULL,
  amount_cents integer NOT NULL,
  time timestamptz NOT NULL,
  note text,
  responded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aime_attestations_project ON aime_attestations(project_id);
COMMIT;
`,
  },
  {
    name: "20260918_attestation_claims.sql",
    sql: String.raw`
-- Le Profil qui naît rempli : la contrepartie rattache ses Moments attestés à sa Carte.
-- Aucune adresse n'est déduite d'un contact ; l'organisateur la confirme, le compte la vérifie.
BEGIN;
ALTER TABLE aime_attestation_links ADD COLUMN IF NOT EXISTS claim_email text;
ALTER TABLE aime_attestation_links ADD COLUMN IF NOT EXISTS claimed_card_user_id text REFERENCES aime_universal_cards(user_id) ON DELETE SET NULL;
ALTER TABLE aime_attestation_links ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
CREATE INDEX IF NOT EXISTS aime_attestation_links_claimed_card ON aime_attestation_links(claimed_card_user_id);
COMMIT;
`,
  },
];
