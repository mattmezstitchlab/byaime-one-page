// Les migrations embarquées (lib/db/src/migrations.ts) sont la copie exacte des
// fichiers .sql, et la séquence complète se rejoue deux fois sur une base vide :
// c'est exactement ce que l'API fait au démarrage (ensureSchema).
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const source = await readFile(new URL("../lib/db/src/migrations.ts", import.meta.url), "utf8");
/* Le module TS n'importe rien : on l'évalue tel quel. */
const { MIGRATIONS } = await import(`data:text/javascript,${encodeURIComponent(source.replace(/: ReadonlyArray<\{ name: string; sql: string \}>/, ""))}`);

assert.ok(MIGRATIONS.length >= 5, "au moins cinq migrations embarquées");
for (const { name, sql } of MIGRATIONS) {
  const file = await readFile(new URL(`../lib/db/migrations/${name}`, import.meta.url), "utf8");
  assert.equal(sql.trim(), file.trim(), `${name} : la copie embarquée diverge du fichier — lancez corepack pnpm run db:sync-migrations`);
}

/* Et le générateur est bien à jour (une migration ajoutée sans relance du script). */
const regenerated = execFileSync("node", [new URL("./sync-migrations.mjs", import.meta.url).pathname], { encoding: "utf8" });
const after = await readFile(new URL("../lib/db/src/migrations.ts", import.meta.url), "utf8");
assert.equal(after, source, "lib/db/src/migrations.ts n'était pas régénéré");

/* Base vide : seules les tables « historiques » (créées avant les migrations SQL) existent. */
const db = new PGlite();
await db.exec(`
  CREATE TABLE aime_projects (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
  CREATE TABLE aime_memberships (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL, user_id text NOT NULL, role text NOT NULL, UNIQUE(project_id,user_id));
  CREATE TABLE aime_rsvps (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL DEFAULT gen_random_uuid(), response jsonb);
`);
for (const round of [1, 2]) {
  for (const { name, sql } of MIGRATIONS) {
    try { await db.exec(sql); } catch (error) { throw new Error(`passe ${round}, ${name} : ${error.message}`); }
  }
}
const tables = await db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1`);
const names = tables.rows.map((r) => r.table_name);
for (const expected of ["aime_universal_cards", "aime_professional_profiles", "aime_professional_assignments", "aime_attestation_links", "aime_attestations"])
  assert.ok(names.includes(expected), `table ${expected} attendue`);
const cols = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='aime_attestation_links'`);
for (const c of ["claim_email", "claimed_card_user_id", "claimed_at"]) assert.ok(cols.rows.some((r) => r.column_name === c), `colonne ${c}`);
await db.close();
console.log(`embedded migrations ok — ${MIGRATIONS.length} fichiers, rejoués deux fois, ${regenerated.trim()}`);
