import { and, eq } from "drizzle-orm";
import {
  membershipsTable,
  projectsTable,
  rsvpsTable,
  universalCardsTable,
} from "@workspace/db/schema";
import {
  claimEligibility,
  normalizedClaimEmail,
  participationWithRsvp,
  rsvpClaimConflicts,
  withoutRsvpCopies,
} from "./rsvpClaim";

type Database = Pick<typeof import("@workspace/db").db, "transaction">;
type Input = {
  token: string;
  userId: string;
  verifiedEmails: string[];
  confirm: boolean;
};
/** Same transaction used by preview and confirmation. No name-based matching. */
export async function claimRsvp(db: Database, input: Input) {
  return db.transaction(async (tx) => {
    const [initial] = await tx
      .select()
      .from(rsvpsTable)
      .where(eq(rsvpsTable.token, input.token));
    if (!initial)
      return { error: "Invitation invalide ou révoquée.", status: 404 };
    // Serializes claims and recipient changes for the same wedding.
    const [project] = await tx
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, initial.projectId))
      .for("update");
    const [link] = await tx
      .select()
      .from(rsvpsTable)
      .where(eq(rsvpsTable.token, input.token))
      .for("update");
    if (!project || !link || (project.data as any)?.closure?.closedAt)
      return {
        error: "Invitation indisponible ou mariage clôturé.",
        status: 409,
      };
    const [card] = await tx
      .select()
      .from(universalCardsTable)
      .where(eq(universalCardsTable.userId, input.userId))
      .for("share");
    const siblings = await tx
      .select()
      .from(rsvpsTable)
      .where(eq(rsvpsTable.projectId, project.id));
    const guests = Array.isArray((project.data as any)?.guests)
      ? ((project.data as any).guests as { id?: string; name?: string }[])
      : [];
    const matched = guests.filter((g) => g.id === link.guestId);
    const error = claimEligibility({
      ...input,
      hasCard: Boolean(card),
      revoked: link.revoked,
      claimedAt: link.claimedAt,
      claimedCardUserId: link.claimedCardUserId,
      claimEmail: link.claimEmail,
      sameRecipientCount: siblings.filter(
        (r) =>
          !r.revoked &&
          normalizedClaimEmail(r.claimEmail) ===
            normalizedClaimEmail(link.claimEmail),
      ).length,
      guestExists: matched.length === 1,
      anotherInvitationClaimed: siblings.some(
        (r) => r.id !== link.id && r.claimedCardUserId === input.userId,
      ),
    });
    if (error) return { error, status: 403 };
    const [member] = await tx
      .select()
      .from(membershipsTable)
      .where(
        and(
          eq(membershipsTable.projectId, project.id),
          eq(membershipsTable.userId, input.userId),
        ),
      )
      .for("update");
    const conflicts = rsvpClaimConflicts(member?.participation, link.response);
    if (conflicts.length && !link.claimedAt)
      return {
        error:
          "Des réponses existent déjà dans votre association et diffèrent du RSVP. Résolvez ce conflit avant le rattachement ; rien n’a été écrasé.",
        status: 409,
        conflicts,
      };
    if (input.confirm && !link.claimedAt) {
      await tx
        .insert(membershipsTable)
        .values({
          projectId: project.id,
          userId: input.userId,
          cardUserId: input.userId,
          email: link.claimEmail,
          role: "viewer",
          participantOnly: true,
        })
        .onConflictDoNothing();
      const participation = participationWithRsvp(
        member?.participation,
        link.response,
      );
      if (!participation.roles.length) participation.roles = ["Invité"];
      await tx
        .update(membershipsTable)
        .set({
          cardUserId: input.userId,
          participation: withoutRsvpCopies(participation),
        })
        .where(
          and(
            eq(membershipsTable.projectId, project.id),
            eq(membershipsTable.userId, input.userId),
          ),
        );
      await tx
        .update(rsvpsTable)
        .set({ claimedCardUserId: input.userId, claimedAt: new Date() })
        .where(eq(rsvpsTable.id, link.id));
    }
    return {
      projectId: project.id,
      projectTitle: project.title,
      guestName: matched[0]?.name ?? "Votre invitation",
      alreadyClaimed: Boolean(link.claimedAt),
      confirmed: input.confirm,
    };
  });
}
