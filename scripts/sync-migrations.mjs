// Régénère lib/db/src/migrations.ts depuis lib/db/migrations/*.sql (source unique).
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "lib/db/migrations");
/* L'ordre d'application est une décision, pas un tri : une migration modifie
   une table qu'une autre crée. Toute migration nouvelle doit être ajoutée ici. */
const ORDER = [
  "20260916_universal_cards.sql",
  "20260916_professional_profiles.sql",
  "20260916_verified_rsvp_claims.sql",
  "20260918_attestations.sql",
  "20260918_attestation_claims.sql",
];
const present = (await readdir(dir)).filter((f) => f.endsWith(".sql"));
const unknown = present.filter((f) => !ORDER.includes(f));
const missing = ORDER.filter((f) => !present.includes(f));
if (unknown.length || missing.length)
  throw new Error(`ORDER et lib/db/migrations divergent — non listées : [${unknown}] ; absentes du dossier : [${missing}]`);
const files = ORDER;
const parts = [];
for (const name of files) {
  const sql = await readFile(path.join(dir, name), "utf8");
  if (sql.includes("`") || sql.includes("${")) throw new Error(`${name} : accent grave ou \${ interdit dans un gabarit`);
  parts.push(`  {\n    name: "${name}",\n    sql: String.raw\`\n${sql.trimEnd()}\n\`,\n  },`);
}
const out = `/*
 * Les migrations SQL, embarquées dans le code.
 *
 * Pourquoi un doublon de \`lib/db/migrations/*.sql\` : l'API applique elle-même
 * son schéma au démarrage (voir \`ensure-schema.ts\`), y compris sur Vercel où
 * seul le bundle est déployé — les fichiers \`.sql\` n'y sont pas. Les fichiers
 * restent la source lisible et rejouable à la main ; ce module en est la copie
 * exacte, et \`migrations.test.ts\` refuse toute divergence entre les deux.
 *
 * Ne rien écrire ici à la main : modifier le \`.sql\`, puis relancer
 * \`corepack pnpm run db:sync-migrations\`.
 */
export const MIGRATIONS: ReadonlyArray<{ name: string; sql: string }> = [
${parts.join("\n")}
];
`;
await writeFile(path.join(root, "lib/db/src/migrations.ts"), out);
console.log(`${files.length} migration(s) embarquée(s) : ${files.join(", ")}`);
