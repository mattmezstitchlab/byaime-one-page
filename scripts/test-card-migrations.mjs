import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

// Isolated PostgreSQL; never reads DATABASE_URL or any production credentials.
const db = new PGlite();
try {
  await db.exec(`
    CREATE TABLE aime_memberships (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL, user_id text NOT NULL, role text NOT NULL, UNIQUE(project_id,user_id));
    CREATE TABLE aime_rsvps (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL DEFAULT gen_random_uuid(), response jsonb);
    INSERT INTO aime_rsvps(response) VALUES ('{"name":"Jean Dupont","allergens":"historical-only"}');
    INSERT INTO aime_memberships(project_id,user_id,role) VALUES (gen_random_uuid(),'legacy','viewer');
  `);
  const first = await readFile(
    new URL(
      "../lib/db/migrations/20260916_universal_cards.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const second = await readFile(
    new URL(
      "../lib/db/migrations/20260916_professional_profiles.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const third = await readFile(
    new URL(
      "../lib/db/migrations/20260916_verified_rsvp_claims.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(first);
  const legacy = {
    firstName: "Jean",
    lastName: "Dupont",
    profession: "Photographe",
    professional: {
      Photographe: { Installation: "30 minutes", Livraison: "Galerie privée" },
    },
  };
  await db.query(
    "INSERT INTO aime_universal_cards(user_id,data) VALUES ($1,$2)",
    ["jean", legacy],
  );
  const a = (
    await db.query(
      `INSERT INTO aime_memberships(project_id,user_id,role,card_user_id,participation) VALUES (gen_random_uuid(),'jean','owner','jean','{"roles":["Photographe"]}') RETURNING id`,
    )
  ).rows[0].id;
  const b = (
    await db.query(
      `INSERT INTO aime_memberships(project_id,user_id,role,card_user_id,participation) VALUES (gen_random_uuid(),'jean','viewer','jean','{"roles":["Invité"]}') RETURNING id`,
    )
  ).rows[0].id;
  await db.exec(second);
  await db.exec(first);
  await db.exec(second);
  await db.exec(third);
  await db.exec(third);
  assert.equal(
    (
      await db.query(
        "SELECT claim_email,claimed_card_user_id,claimed_at FROM aime_rsvps",
      )
    ).rows[0].claimed_at,
    null,
  );
  assert.equal(
    (
      await db.query(
        "SELECT participant_only FROM aime_memberships WHERE user_id='legacy'",
      )
    ).rows[0].participant_only,
    false,
  );
  const card = (
    await db.query(`SELECT data FROM aime_universal_cards WHERE user_id='jean'`)
  ).rows[0].data;
  assert.equal(card.firstName, "Jean");
  assert.equal("professional" in card, false);
  const p = (
    await db.query(
      `SELECT * FROM aime_professional_profiles WHERE card_user_id='jean'`,
    )
  ).rows;
  assert.equal(p.length, 1);
  assert.deepEqual(p[0].data.legacyNotes, legacy.professional.Photographe);
  assert.deepEqual(p[0].data.parameters, {});
  assert.equal(
    (await db.query(`SELECT count(*)::int AS n FROM aime_universal_cards`))
      .rows[0].n,
    1,
  );
  const intervention = { anchor: { presence: "arrival" }, overrides: {} };
  await db.query(
    `INSERT INTO aime_professional_assignments(membership_id,user_id,profile_id,data) VALUES ($1,'jean',$2,$3)`,
    [a, p[0].id, intervention],
  );
  const otherCard = { firstName: "Paul", lastName: "Martin" };
  await db.query(
    `INSERT INTO aime_universal_cards(user_id,data) VALUES ('paul',$1)`,
    [otherCard],
  );
  const paul = (
    await db.query(
      `INSERT INTO aime_memberships(project_id,user_id,role,card_user_id) VALUES (gen_random_uuid(),'paul','viewer','paul') RETURNING id`,
    )
  ).rows[0].id;
  await assert.rejects(
    db.query(
      `INSERT INTO aime_professional_assignments(membership_id,user_id,profile_id,data) VALUES ($1,'paul',$2,'{}')`,
      [paul, p[0].id],
    ),
  );
  await assert.rejects(
    db.query(
      `INSERT INTO aime_professional_assignments(membership_id,user_id,profile_id,data) VALUES ($1,'jean',$2,'{}')`,
      [paul, p[0].id],
    ),
  );
  await assert.rejects(
    db.query(`UPDATE aime_memberships SET card_user_id='jean' WHERE id=$1`, [
      paul,
    ]),
  );
  await assert.rejects(
    db.query(
      `INSERT INTO aime_professional_profiles(card_user_id,profession,data) VALUES ('jean','Photographe','{}')`,
    ),
  );
  assert.deepEqual(
    (
      await db.query(`SELECT participation FROM aime_memberships WHERE id=$1`, [
        b,
      ])
    ).rows[0].participation,
    { roles: ["Invité"] },
  );
  const rsvp = (await db.query("SELECT response FROM aime_rsvps")).rows[0]
    .response;
  assert.deepEqual(rsvp, { name: "Jean Dupont", allergens: "historical-only" });
  // Profile changes are live through the FK, not copied in assignment data.
  await db.query(
    `UPDATE aime_professional_profiles SET data=jsonb_set(data,'{parameters}','{"durationMinutes":510,"setupMinutes":30}') WHERE id=$1`,
    [p[0].id],
  );
  await db.exec(second); // Does not overwrite typed parameters on re-run.
  assert.equal(
    (
      await db.query(
        `SELECT data->'parameters'->>'durationMinutes' AS n FROM aime_professional_profiles WHERE id=$1`,
        [p[0].id],
      )
    ).rows[0].n,
    "510",
  );
  assert.deepEqual(
    (await db.query("SELECT data FROM aime_professional_assignments")).rows[0]
      .data,
    intervention,
  );
  await db.query(`DELETE FROM aime_memberships WHERE id=$1`, [a]);
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM aime_professional_assignments",
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (
      await db.query(
        `SELECT count(*)::int AS n FROM aime_professional_profiles WHERE card_user_id='jean'`,
      )
    ).rows[0].n,
    1,
  );
  await db.query(
    `INSERT INTO aime_universal_cards(user_id,data) VALUES ('malformed', $1)`,
    [{ firstName: "Test", professional: ["unrecognized"] }],
  );
  await assert.rejects(db.exec(second));
  await db.exec("ROLLBACK");
  assert.deepEqual(
    (
      await db.query(
        `SELECT data->'professional' AS value FROM aime_universal_cards WHERE user_id='malformed'`,
      )
    ).rows[0].value,
    ["unrecognized"],
  );
  await db.exec(`DELETE FROM aime_universal_cards WHERE user_id='malformed'`);
  // Account deletion: dependent profiles/interventions go away, historical memberships remain unlinked.
  await db.query(
    `INSERT INTO aime_professional_assignments(membership_id,user_id,profile_id,data) VALUES ($1,'jean',$2,$3)`,
    [b, p[0].id, intervention],
  );
  const claimed = (
    await db.query(
      `UPDATE aime_rsvps SET claim_email='jean@example.org', claimed_card_user_id='jean', claimed_at=now() RETURNING project_id, claimed_at`,
    )
  ).rows[0];
  await assert.rejects(
    db.query(
      `INSERT INTO aime_rsvps(project_id, claimed_card_user_id, claimed_at) VALUES ($1,'jean',now())`,
      [claimed.project_id],
    ),
  );
  await db.exec(`DELETE FROM aime_universal_cards WHERE user_id='jean'`);
  const tombstone = (await db.query("SELECT * FROM aime_rsvps")).rows[0];
  assert.equal(tombstone.claimed_card_user_id, null);
  assert.deepEqual(tombstone.claimed_at, claimed.claimed_at);
  assert.deepEqual(tombstone.response, rsvp);

  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM aime_professional_assignments",
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (
      await db.query(`SELECT card_user_id FROM aime_memberships WHERE id=$1`, [
        b,
      ])
    ).rows[0].card_user_id,
    null,
  );
  assert.equal(
    (
      await db.query(
        `SELECT count(*)::int AS n FROM aime_memberships WHERE user_id='legacy'`,
      )
    ).rows[0].n,
    1,
  );
  console.log(
    "PASS: three additive migrations, verified-claim uniqueness and closed tombstones, idempotency, lossless profile extraction, ownership FKs, one person / two contexts, unchanged anonymous RSVP and cascade lifecycle.",
  );
} finally {
  await db.close();
}
