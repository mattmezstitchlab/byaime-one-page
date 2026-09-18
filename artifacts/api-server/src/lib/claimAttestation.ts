import { and, eq } from "drizzle-orm";
import { attestationLinksTable, attestationsTable, projectsTable, universalCardsTable } from "@workspace/db/schema";
import { findProvider } from "@workspace/aime-domain";
import { attestationClaimEligibility, countersignedMoments } from "./attestationClaim";

type Database = Pick<typeof import("@workspace/db").db, "transaction">;
type Input = {
  token: string;
  userId: string;
  verifiedEmails: string[];
  confirm: boolean;
};

/**
 * Même transaction pour l'aperçu et la confirmation, comme `claimRsvp`.
 * Le rattachement porte sur le prestataire entier dans ce Monde : tous ses
 * liens non révoqués passent à la Carte en une seule écriture. Rien n'est
 * copié dans la Carte : le Profil relit les Moments depuis le Monde, à
 * l'instant où on le regarde — une attestation périmée le reste.
 */
export async function claimAttestation(db: Database, input: Input) {
  return db.transaction(async (tx) => {
    const [initial] = await tx.select().from(attestationLinksTable).where(eq(attestationLinksTable.token, input.token));
    if (!initial) return { error: "Lien d'attestation invalide ou révoqué.", status: 404 as const };
    const [project] = await tx.select().from(projectsTable).where(eq(projectsTable.id, initial.projectId)).for("update");
    const [link] = await tx.select().from(attestationLinksTable).where(eq(attestationLinksTable.token, input.token)).for("update");
    if (!project || !link) return { error: "Lien d'attestation invalide ou révoqué.", status: 404 as const };
    const [card] = await tx.select().from(universalCardsTable).where(eq(universalCardsTable.userId, input.userId)).for("share");
    const siblings = await tx.select().from(attestationLinksTable).where(eq(attestationLinksTable.projectId, project.id));
    const provider = findProvider(project.data, link.providerId);
    const error = attestationClaimEligibility({
      userId: input.userId,
      hasCard: Boolean(card),
      link,
      verifiedEmails: input.verifiedEmails,
      siblings,
      providerExists: Boolean(provider),
      closed: Boolean((project.data as any)?.closure?.closedAt),
    });
    if (error) return { error, status: 403 as const };
    const mine = siblings.filter(item => !item.revoked && item.providerId === link.providerId);
    if (input.confirm && !link.claimedAt) {
      await tx
        .update(attestationLinksTable)
        .set({ claimedCardUserId: input.userId, claimedAt: new Date() })
        .where(and(eq(attestationLinksTable.projectId, project.id), eq(attestationLinksTable.providerId, link.providerId), eq(attestationLinksTable.revoked, false)));
    }
    const history = await tx
      .select({ eventId: attestationsTable.eventId, providerId: attestationsTable.providerId, status: attestationsTable.status, hash: attestationsTable.hash, respondedAt: attestationsTable.respondedAt })
      .from(attestationsTable)
      .where(and(eq(attestationsTable.projectId, project.id), eq(attestationsTable.providerId, link.providerId)));
    return {
      projectId: project.id,
      projectTitle: project.title,
      providerRole: typeof provider?.role === "string" ? provider.role : "",
      moments: countersignedMoments(project, mine, history),
      alreadyClaimed: Boolean(link.claimedAt),
      confirmed: input.confirm,
    };
  });
}
