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
