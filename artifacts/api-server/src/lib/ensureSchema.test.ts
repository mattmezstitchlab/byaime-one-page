import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
/* Import direct : `@workspace/db` exige DATABASE_URL au chargement, pas ici. */
import { ensureSchema, schemaGuard } from "@workspace/db/ensure-schema";
import { MIGRATIONS } from "@workspace/db/ensure-schema";

/*
 * Le schéma appliqué par l'API elle-même : on branche `ensureSchema` sur un
 * Postgres en mémoire à travers un faux pool qui parle comme `pg`. Le verrou
 * consultatif est simulé (PGlite est mono-connexion).
 */
async function fakePool(db: PGlite) {
  const queries: string[] = [];
  const client = {
    async query(sql: string, params?: unknown[]) {
      queries.push(sql.trim().split("\n")[0]);
      if (/pg_advisory_(un)?lock/.test(sql)) return { rows: [] };
      if (/^\s*ROLLBACK/i.test(sql)) { try { await db.exec("ROLLBACK"); } catch { /* aucune transaction ouverte */ } return { rows: [] }; }
      await db.exec(sql);
      void params;
      return { rows: [] };
    },
    release() { /* rien */ },
  };
  return { pool: { connect: async () => client } as unknown as Parameters<typeof ensureSchema>[0], queries };
}
const quiet = { info() {}, warn() {}, error() {} };

async function blankBase() {
  const db = new PGlite();
  await db.exec(`
    CREATE TABLE aime_projects (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    CREATE TABLE aime_memberships (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL, user_id text NOT NULL, role text NOT NULL, UNIQUE(project_id,user_id));
    CREATE TABLE aime_rsvps (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL DEFAULT gen_random_uuid(), response jsonb);
  `);
  return db;
}

describe("ensureSchema — l'API applique son schéma toute seule", () => {
  it("crée les tables des attestations sur une base qui ne les a pas, sous verrou, et reste idempotent", async () => {
    const db = await blankBase();
    const { pool, queries } = await fakePool(db);
    const first = await ensureSchema(pool, quiet);
    expect(first.error).toBeUndefined();
    expect(first.applied).toEqual(MIGRATIONS.map(m => m.name));
    expect(queries[0]).toContain("pg_advisory_lock");
    expect(queries[queries.length - 1]).toContain("pg_advisory_unlock");
    const tables = await db.query<{ table_name: string }>(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
    const names = tables.rows.map(r => r.table_name);
    expect(names).toEqual(expect.arrayContaining(["aime_attestation_links", "aime_attestations", "aime_universal_cards"]));
    const again = await ensureSchema(pool, quiet);
    expect(again.error).toBeUndefined();
    await db.close();
  });

  it("une migration qui casse est nommée, la connexion est rendue, et le verrou relâché", async () => {
    const db = new PGlite(); /* pas même aime_projects : la FK échoue */
    const { pool, queries } = await fakePool(db);
    const result = await ensureSchema(pool, quiet);
    expect(result.error).toMatch(/aime_projects|does not exist/);
    expect(queries[queries.length - 1]).toContain("pg_advisory_unlock");
    await db.close();
  });

  it("schemaGuard : une seule vérification par processus, partagée par les requêtes simultanées", async () => {
    const db = await blankBase();
    let connects = 0;
    const { pool } = await fakePool(db);
    const counting = { connect: async () => { connects += 1; return (pool as any).connect(); } } as unknown as typeof pool;
    const guard = schemaGuard(counting, quiet);
    await Promise.all([guard(), guard(), guard()]);
    await guard();
    expect(connects).toBe(1);
    await db.close();
  });
});
