/**
 * Applique les migrations SQL de `lib/db/migrations/` à une base Postgres.
 *
 * Pourquoi : les migrations ne sont PAS appliquées au déploiement
 * (docs/vercel-deployment.md). Sans `psql` sous la main, on n'avait aucun
 * moyen simple de les passer. Ce script le fait avec le pilote `pg` que
 * `lib/db` déclare déjà — rien à installer.
 *
 *   DATABASE_URL="postgres://…" corepack pnpm run db:migrate
 *
 * Chaque fichier est joué tel quel, dans l'ordre alphabétique (les noms
 * commencent par une date). Tous sont idempotents (`IF NOT EXISTS`) :
 * relancer le script ne change rien à une base déjà à jour.
 *
 * Le mot de passe n'est jamais affiché.
 */

import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    [
      "DATABASE_URL est absente.",
      "",
      "Récupérez-la dans Vercel → projet byaime-one-page → Settings → Environment",
      "Variables (environnement Production), puis :",
      "",
      '  DATABASE_URL="postgres://…" corepack pnpm run db:migrate',
    ].join("\n"),
  );
  process.exit(2);
}

function urlExpurgee(value: string): string {
  try {
    const parsee = new URL(value);
    if (parsee.password) parsee.password = "masque";
    return parsee.toString().replace(/:masque@/, ":***@");
  } catch {
    return "(URL illisible)";
  }
}

type ClientMinimal = {
  query: (sql: string) => Promise<unknown>;
  end: () => Promise<unknown>;
};
type ConstructeurPool = new (config: { connectionString: string; connectionTimeoutMillis: number; max: number }) => ClientMinimal;

const requireDepuisDb = createRequire(new URL("../../lib/db/package.json", import.meta.url));
const { Pool } = requireDepuisDb("pg") as { Pool: ConstructeurPool };

const dossier = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../lib/db/migrations");
const fichiers = (await readdir(dossier)).filter((nom) => nom.endsWith(".sql")).sort();
const seulement = process.argv.slice(2);
const aJouer = seulement.length ? fichiers.filter((nom) => seulement.includes(nom)) : fichiers;

if (seulement.length && aJouer.length !== seulement.length) {
  const inconnus = seulement.filter((nom) => !fichiers.includes(nom));
  console.error(`Migration(s) introuvable(s) : ${inconnus.join(", ")}`);
  console.error(`Disponibles : ${fichiers.join(", ")}`);
  process.exit(2);
}

console.log(`Base cible : ${urlExpurgee(url)}`);
console.log(`Migrations à appliquer (${aJouer.length}) : ${aJouer.join(", ")}`);
console.log("");

const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 8_000, max: 1 });
let echec = false;
for (const nom of aJouer) {
  const sql = await readFile(path.join(dossier, nom), "utf8");
  try {
    /* Les fichiers portent leur propre BEGIN/COMMIT : on les joue d'un bloc. */
    await pool.query(sql);
    console.log(`  ✓ ${nom}`);
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : String(erreur);
    console.error(`  ✗ ${nom}`);
    console.error(`    ${message}`);
    /* Le fichier a ouvert une transaction : on la referme proprement. */
    await pool.query("ROLLBACK").catch(() => undefined);
    echec = true;
    break;
  }
}
await pool.end().catch(() => undefined);

console.log("");
if (echec) {
  console.error("Arrêt à la première erreur : rien de ce fichier n'a été appliqué (transaction annulée).");
  console.error("Les fichiers précédents, eux, le sont. Corrigez puis relancez : le script est idempotent.");
  process.exit(1);
}
console.log("Terminé. Vérifiez avec : DATABASE_URL=\"…\" corepack pnpm run check:db");
