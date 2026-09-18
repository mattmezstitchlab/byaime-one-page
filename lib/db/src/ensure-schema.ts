import type pg from "pg";
import { MIGRATIONS } from "./migrations";
export { MIGRATIONS };

/*
 * L'API applique elle-même son schéma.
 *
 * Pourquoi : le déploiement Vercel ne joue pas les migrations, et demander à
 * quelqu'un d'ouvrir un éditeur SQL pour coller deux fichiers n'est pas une
 * procédure — c'est un piège (18/09 : « c'est compliqué »). Toutes les
 * migrations sont idempotentes (`IF NOT EXISTS`) ; les rejouer à chaque
 * démarrage coûte quelques millisecondes et garantit que le code ne tourne
 * jamais devant une base qui ne le connaît pas.
 *
 * Concurrence : plusieurs instances serverless peuvent démarrer en même temps.
 * Un verrou consultatif Postgres sérialise l'application ; celles qui attendent
 * trouvent le travail fait.
 *
 * Échec : une migration qui casse ne doit pas rendre l'API muette. On journalise
 * et on laisse passer — les routes concernées répondront leur erreur JSON
 * habituelle, et `check:db` dira quoi.
 */

const LOCK_KEY = 7_226_331; /* arbitraire, stable : « aime schema » */

type Logger = { info(msg: string): void; warn(msg: string): void; error(msg: string): void };

export async function ensureSchema(pool: pg.Pool, log: Logger = console): Promise<{ applied: string[]; error?: string }> {
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
    try {
      for (const migration of MIGRATIONS) {
        try {
          await client.query(migration.sql);
          applied.push(migration.name);
        } catch (error) {
          await client.query("ROLLBACK").catch(() => undefined);
          const message = error instanceof Error ? error.message : String(error);
          log.error(`schéma : ${migration.name} a échoué — ${message}`);
          return { applied, error: `${migration.name}: ${message}` };
        }
      }
      log.info(`schéma : ${applied.length} migration(s) vérifiée(s)`);
      return { applied };
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => undefined);
    }
  } finally {
    client.release();
  }
}

/** Une seule vérification par processus, partagée par toutes les requêtes en attente. */
export function schemaGuard(pool: pg.Pool, log?: Logger) {
  let pending: Promise<unknown> | null = null;
  return () => {
    if (!pending) {
      pending = ensureSchema(pool, log).catch((error) => {
        /* Base injoignable : on ne bloque pas, la route dira l'erreur. Mais on
           réessaiera à la prochaine requête. */
        log?.warn(`schéma : vérification impossible — ${error instanceof Error ? error.message : String(error)}`);
        pending = null;
      });
    }
    return pending;
  };
}
