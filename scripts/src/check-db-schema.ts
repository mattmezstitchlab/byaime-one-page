/**
 * Diagnostic de la base de données d’un déploiement.
 *
 * Pourquoi cet outil existe : le 16/09/2026, `/ma-carte` affichait en production
 * « Unexpected token '<', "<!DOCTYPE "... is not valid JSON ». La chaîne était :
 * une route `/api/*` lève parce que la base n’a pas le schéma attendu → Express,
 * sans gestionnaire d’erreur, répond une page HTML → le navigateur n’arrive pas à
 * la lire comme du JSON. Le gestionnaire JSON (`artifacts/api-server/src/lib/apiFailure.ts`)
 * empêche désormais le texte technique d’atteindre l’écran, mais il ne dit pas
 * **pourquoi** la base a refusé : c’est le rôle de ce script.
 *
 * Lecture seule. Il ne crée rien, ne modifie rien, n’écrit jamais le mot de
 * passe : l’URL de connexion est affichée expurgée.
 *
 *   DATABASE_URL="postgres://…" corepack pnpm run check:db
 *
 * Codes de sortie : 0 schéma complet, 1 schéma incomplet ou connexion impossible,
 * 2 usage (URL absente).
 */

import { createRequire } from "node:module";

/** Les tables déclarées par `lib/db/src/schema/aime.ts`. */
const TABLES_ATTENDUES = [
  "aime_files",
  "aime_invitations",
  "aime_local_bridge_sessions",
  "aime_local_import_jobs",
  "aime_local_pairing_tokens",
  "aime_local_references",
  "aime_local_scan_jobs",
  "aime_memberships",
  "aime_messages",
  "aime_professional_assignments",
  "aime_professional_profiles",
  "aime_projects",
  "aime_rsvps",
  "aime_song_requests",
  "aime_universal_cards",
] as const;

/** Les colonnes ajoutées par les migrations du 16/09/2026. */
const COLONNES_ATTENDUES = [
  { table: "aime_memberships", colonne: "card_user_id", migration: "20260916_universal_cards.sql" },
  { table: "aime_memberships", colonne: "participation", migration: "20260916_universal_cards.sql" },
  { table: "aime_memberships", colonne: "participant_only", migration: "20260916_verified_rsvp_claims.sql" },
  { table: "aime_rsvps", colonne: "claim_email", migration: "20260916_verified_rsvp_claims.sql" },
  { table: "aime_rsvps", colonne: "claimed_card_user_id", migration: "20260916_verified_rsvp_claims.sql" },
  { table: "aime_rsvps", colonne: "claimed_at", migration: "20260916_verified_rsvp_claims.sql" },
] as const;

const MIGRATIONS = [
  "20260916_universal_cards.sql",
  "20260916_professional_profiles.sql",
  "20260916_verified_rsvp_claims.sql",
] as const;

/** L’URL sans son mot de passe : la sortie peut être collée dans un rapport. */
function urlExpurgee(url: string): string {
  try {
    const parsee = new URL(url);
    /* Un « … » serait pourcentage-encodé par `toString()` : on masque en ASCII. */
    if (parsee.password) parsee.password = "masque";
    return parsee.toString().replace(/:masque@/, ":***@");
  } catch {
    return "(URL illisible)";
  }
}

function usageEtSortie(): never {
  console.error(
    [
      "DATABASE_URL est absente.",
      "",
      "Récupérez-la dans Vercel → projet byaime-one-page → Settings → Environment",
      "Variables (environnement Production), puis :",
      "",
      '  DATABASE_URL="postgres://…" corepack pnpm run check:db',
      "",
      "Elle n’est jamais demandée ici, et ce script ne l’affiche pas en clair.",
    ].join("\n"),
  );
  process.exit(2);
}

const url = process.env.DATABASE_URL;
if (!url) usageEtSortie();

/* `pg` vient de `@workspace/db`, qui le déclare : pas de dépendance ajoutée à la
   racine pour un outil de diagnostic, et pas de `@types/pg` non plus — d’où le
   type structural minimal ci-dessous. */
type ClientMinimal = {
  query: <Ligne>(sql: string) => Promise<{ rows: Ligne[] }>;
  end: () => Promise<unknown>;
};
type ConstructeurPool = new (config: {
  connectionString: string;
  connectionTimeoutMillis: number;
  max: number;
}) => ClientMinimal;

const requireDepuisDb = createRequire(new URL("../../lib/db/package.json", import.meta.url));
const { Pool } = requireDepuisDb("pg") as { Pool: ConstructeurPool };

const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 8_000, max: 1 });

console.log(`Base inspectée : ${urlExpurgee(url)}`);

let tablesPresentes: string[] = [];
let colonnesPresentes: string[] = [];
try {
  const tables = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  );
  const presentes = new Set(tables.rows.map((ligne) => ligne.table_name));
  tablesPresentes = TABLES_ATTENDUES.filter((table) => presentes.has(table));

  const colonnes = await pool.query<{ table_name: string; column_name: string }>(
    `SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public'`,
  );
  const paires = new Set(colonnes.rows.map((ligne) => `${ligne.table_name}.${ligne.column_name}`));
  colonnesPresentes = COLONNES_ATTENDUES.filter((attendue) =>
    paires.has(`${attendue.table}.${attendue.colonne}`),
  ).map((attendue) => `${attendue.table}.${attendue.colonne}`);
} catch (erreur) {
  const message = erreur instanceof Error ? erreur.message : String(erreur);
  console.error(
    [
      "",
      "Connexion ou lecture impossible.",
      `Détail : ${message}`,
      "",
      "C’est ce que reçoit l’API en production : chaque route qui lit la base",
      "répond alors une erreur interne. À vérifier : l’hôte, le port, les",
      "identifiants, et l’autorisation du réseau Vercel vers la base",
      "(IP allowlist, `sslmode=require`).",
    ].join("\n"),
  );
  await pool.end().catch(() => undefined);
  process.exit(1);
}
await pool.end().catch(() => undefined);

const tablesManquantes = TABLES_ATTENDUES.filter((table) => !tablesPresentes.includes(table));
const colonnesManquantes = COLONNES_ATTENDUES.filter(
  (attendue) => !colonnesPresentes.includes(`${attendue.table}.${attendue.colonne}`),
);

console.log("");
console.log(`Tables (schéma public) : ${tablesPresentes.length}/${TABLES_ATTENDUES.length} présentes`);
for (const table of TABLES_ATTENDUES)
  console.log(`  ${tablesManquantes.includes(table) ? "✗ absente " : "✓ présente"}  ${table}`);

console.log("");
console.log(`Colonnes du 16/09/2026 : ${colonnesPresentes.length}/${COLONNES_ATTENDUES.length} présentes`);
for (const attendue of COLONNES_ATTENDUES) {
  const cle = `${attendue.table}.${attendue.colonne}`;
  console.log(
    `  ${colonnesPresentes.includes(cle) ? "✓ présente" : "✗ absente "}  ${cle}  (${attendue.migration})`,
  );
}

if (tablesManquantes.length === 0 && colonnesManquantes.length === 0) {
  console.log("");
  console.log("Schéma complet : la base n’est pas la cause de l’échec de /ma-carte.");
  console.log("Regardez alors les journaux de la fonction Vercel (ligne « Erreur non rattrapée »).");
  process.exit(0);
}

console.log("");
console.log("Schéma incomplet : c’est la cause de l’erreur vue sur /ma-carte.");
console.log("Appliquez les migrations dans cet ordre (elles sont idempotentes) :");
for (const migration of MIGRATIONS)
  console.log(`  psql "$DATABASE_URL" -f lib/db/migrations/${migration}`);
console.log("");
console.log(
  `Puis relancez ce script : il doit annoncer ${TABLES_ATTENDUES.length}/${TABLES_ATTENDUES.length} tables `
  + `et ${COLONNES_ATTENDUES.length}/${COLONNES_ATTENDUES.length} colonnes.`,
);
process.exit(1);
