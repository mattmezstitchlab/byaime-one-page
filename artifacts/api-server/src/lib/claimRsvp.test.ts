import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFile } from "node:fs/promises";
import { claimRsvp } from "./claimRsvp";
import { canAccessClaimedRsvp, participationWithRsvp } from "./rsvpClaim";

const client = new PGlite();
// Same Drizzle transaction implementation/SQL, with an isolated PostgreSQL driver.
const db = drizzle(client) as unknown as Parameters<typeof claimRsvp>[0];
const projectId = "11111111-2222-4333-8444-555555555555";
const token = "11111111-2222-4333-8444-555555555556";
const response = {
  status: "confirmed",
  plusOne: true,
  dietary: "sans gluten",
  notes: "historique",
  attendance: { dinner: true },
};
const original = {
  guests: [
    { id: "guest-jean", name: "Jean Dupont", contact: "mutable@example.org" },
  ],
  media: [{ id: "legacy-media" }],
};
const input = {
  token,
  userId: "jean",
  verifiedEmails: ["jean@example.org"],
  confirm: true,
};
async function query(sql: string, values: any[] = []) {
  return (await client.query(sql, values)).rows as any[];
}
beforeAll(async () => {
  await client.exec(`
    CREATE TABLE aime_projects(id uuid PRIMARY KEY, owner_user_id text NOT NULL, title text NOT NULL, data jsonb NOT NULL, retention_days integer DEFAULT 365 NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL);
    CREATE TABLE aime_memberships(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid REFERENCES aime_projects ON DELETE CASCADE NOT NULL, user_id text NOT NULL, email text, role text NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, UNIQUE(project_id,user_id));
    CREATE TABLE aime_rsvps(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid REFERENCES aime_projects ON DELETE CASCADE NOT NULL, guest_id text NOT NULL, token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(), revoked boolean DEFAULT false NOT NULL, response jsonb, responded_at timestamptz, created_at timestamptz DEFAULT now() NOT NULL, UNIQUE(project_id,guest_id));
    CREATE TABLE aime_files(id text PRIMARY KEY, project_id uuid REFERENCES aime_projects ON DELETE CASCADE, guest_id text, name text);
    CREATE TABLE aime_song_requests(id text PRIMARY KEY, project_id uuid REFERENCES aime_projects ON DELETE CASCADE, guest_id text, title text);
  `);
  for (const name of [
    "universal_cards",
    "professional_profiles",
    "verified_rsvp_claims",
  ])
    await client.exec(
      await readFile(
        new URL(
          `../../../../lib/db/migrations/20260916_${name}.sql`,
          import.meta.url,
        ),
        "utf8",
      ),
    );
}, 30000);
beforeEach(async () => {
  await client.exec("TRUNCATE aime_projects, aime_universal_cards CASCADE");
  await query(
    "INSERT INTO aime_projects(id,owner_user_id,title,data) VALUES ($1,$2,$3,$4)",
    [projectId, "organizer", "Mariage A", original],
  );
  await query(
    `INSERT INTO aime_universal_cards(user_id,data) VALUES ('jean','{"firstName":"Jean","lastName":"Dupont"}'),('homonyme','{"firstName":"Jean","lastName":"Dupont"}')`,
  );
  await query(
    `INSERT INTO aime_rsvps(project_id,guest_id,token,response,responded_at,claim_email) VALUES ($1,'guest-jean',$2,$3,'2026-09-15T10:00:00Z','jean@example.org')`,
    [projectId, token, response],
  );
  await query(
    `INSERT INTO aime_files VALUES ('media',$1,'guest-jean','photo historique')`,
    [projectId],
  );
  await query(
    `INSERT INTO aime_song_requests VALUES ('song',$1,'guest-jean','musique historique')`,
    [projectId],
  );
});
afterAll(async () => {
  await client.close();
});
describe("transaction réelle de rattachement dans PostgreSQL isolé", () => {
  it("previews without mutation, explicitly associates once, preserves source records and grants participant-only access", async () => {
    const before = (await query("SELECT * FROM aime_rsvps"))[0];
    expect(await claimRsvp(db, { ...input, confirm: false })).toMatchObject({
      confirmed: false,
      guestName: "Jean Dupont",
    });
    expect(await query("SELECT * FROM aime_memberships")).toEqual([]);
    expect((await query("SELECT * FROM aime_rsvps"))[0]).toEqual(before);
    expect(await claimRsvp(db, input)).toMatchObject({ confirmed: true });
    const linked = (await query("SELECT * FROM aime_rsvps"))[0];
    expect({
      ...linked,
      claim_email: before.claim_email,
      claimed_card_user_id: null,
      claimed_at: null,
    }).toEqual(before);
    const member = (await query("SELECT * FROM aime_memberships"))[0];
    expect(member).toMatchObject({
      user_id: "jean",
      card_user_id: "jean",
      role: "viewer",
      participant_only: true,
    });
    expect(member.participation).not.toHaveProperty("dietary");
    expect(
      participationWithRsvp(member.participation, linked.response),
    ).toMatchObject({ rsvp: "present", dietary: "sans gluten", companions: 1 });
    expect((await query("SELECT data FROM aime_projects"))[0].data).toEqual(
      original,
    );
    expect((await query("SELECT name FROM aime_files"))[0].name).toBe(
      "photo historique",
    );
    expect((await query("SELECT title FROM aime_song_requests"))[0].title).toBe(
      "musique historique",
    );
    expect(await claimRsvp(db, input)).toMatchObject({ alreadyClaimed: true });
    expect(await query("SELECT * FROM aime_rsvps")).toEqual([linked]);
    expect(await query("SELECT * FROM aime_memberships")).toHaveLength(1);
  });
  it("rejects same-name/wrong-account, unverified or absent recipient, ambiguous invitations, revoked tokens and closed contexts", async () => {
    expect(
      (
        await claimRsvp(db, {
          ...input,
          userId: "homonyme",
          verifiedEmails: ["homonyme@example.org"],
        })
      ).error,
    ).toBeTruthy();
    expect(
      (await claimRsvp(db, { ...input, verifiedEmails: [] })).error,
    ).toBeTruthy();
    await query("UPDATE aime_rsvps SET claim_email=NULL");
    expect((await claimRsvp(db, input)).error).toBeTruthy();
    await query(`UPDATE aime_rsvps SET claim_email='jean@example.org'`);
    await query(
      `INSERT INTO aime_rsvps(project_id,guest_id,claim_email) VALUES ($1,'ambiguous','JEAN@example.org')`,
      [projectId],
    );
    expect((await claimRsvp(db, input)).error).toBeTruthy();
    await query(`DELETE FROM aime_rsvps WHERE guest_id='ambiguous'`);
    await query("UPDATE aime_rsvps SET revoked=true");
    expect((await claimRsvp(db, input)).error).toBeTruthy();
    await query("UPDATE aime_rsvps SET revoked=false");
    await query(
      `UPDATE aime_projects SET data=jsonb_set(data,'{closure}','{"closedAt":"2026-09-16"}')`,
    );
    expect((await claimRsvp(db, input)).error).toBeTruthy();
    expect(await query("SELECT * FROM aime_memberships")).toEqual([]);
    expect(
      (await query("SELECT claimed_at FROM aime_rsvps"))[0].claimed_at,
    ).toBeNull();
  });
  it("refuses conflicting existing answers without overwriting roles; keeps existing collaborator permissions on a compatible claim", async () => {
    await query(
      `INSERT INTO aime_memberships(project_id,user_id,role,participation) VALUES ($1,'jean','planner','{"roles":["Témoin","Ami"],"rsvp":"absent"}')`,
      [projectId],
    );
    expect(await claimRsvp(db, input)).toMatchObject({
      status: 409,
      conflicts: ["rsvp"],
    });
    expect(
      (await query("SELECT participation FROM aime_memberships"))[0]
        .participation.rsvp,
    ).toBe("absent");
    await query(
      `UPDATE aime_memberships SET participation='{"roles":["Témoin","Ami"],"rsvp":"present","needs":"privé"}'`,
    );
    expect((await claimRsvp(db, input)).error).toBeUndefined();
    expect((await query("SELECT * FROM aime_memberships"))[0]).toMatchObject({
      role: "planner",
      participant_only: false,
      participation: { roles: ["Témoin", "Ami"], needs: "privé" },
    });
  });
  it("serializes competing requests: one owner, one membership, no transferred invitation or double claim", async () => {
    const results = await Promise.all([
      claimRsvp(db, input),
      claimRsvp(db, { ...input, userId: "homonyme" }),
    ]);
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    expect(await query("SELECT * FROM aime_memberships")).toHaveLength(1);
    const owner = (
      await query("SELECT claimed_card_user_id FROM aime_rsvps")
    )[0].claimed_card_user_id;
    expect(owner).toBe("jean");
    await query(
      `UPDATE aime_projects SET data=jsonb_set(data,'{guests}',data->'guests' || '[{"id":"other","name":"Jean Dupont"}]')`,
    );
    const second = (
      await query(
        `INSERT INTO aime_rsvps(project_id,guest_id,claim_email) VALUES ($1,'other','second@example.org') RETURNING token`,
        [projectId],
      )
    )[0];
    expect(
      (
        await claimRsvp(db, {
          ...input,
          token: second.token,
          verifiedEmails: ["second@example.org"],
        })
      ).error,
    ).toBeTruthy();
    await expect(
      query(
        `UPDATE aime_rsvps SET claimed_card_user_id='jean',claimed_at=now() WHERE token=$1`,
        [second.token],
      ),
    ).rejects.toThrow();
  });
  it("keeps historical answers after token revocation or card deletion, without reopening anonymous access", async () => {
    await claimRsvp(db, input);
    await query("UPDATE aime_rsvps SET revoked=true");
    expect((await claimRsvp(db, input)).error).toBeTruthy();
    await query("UPDATE aime_rsvps SET revoked=false");
    await query(`DELETE FROM aime_universal_cards WHERE user_id='jean'`);
    const row = (await query("SELECT * FROM aime_rsvps"))[0];
    expect(row.response).toEqual(response);
    expect(row.claimed_at).not.toBeNull();
    expect(row.claimed_card_user_id).toBeNull();
    expect(
      canAccessClaimedRsvp({
        claimedAt: row.claimed_at,
        claimedCardUserId: row.claimed_card_user_id,
      }),
    ).toBe(false);
    expect(
      (await claimRsvp(db, { ...input, userId: "homonyme" })).error,
    ).toBeTruthy();
  });
});
