import { buildFactView, factViewFingerprint, findEvent, findProvider } from "@workspace/aime-domain";
import { normalizedClaimEmail } from "./rsvpClaim";

/*
 * LE PROFIL QUI NAÎT REMPLI.
 *
 * Une attestation est anonyme, comme un RSVP : un jeton suffit. Mais dès que
 * la contrepartie a une Carte, elle peut y RATTACHER ses Moments d'un Monde.
 * Son Profil n'est alors plus ce qu'elle raconte : c'est ce que d'autres
 * Mondes ont contresigné, daté, empreinté.
 *
 * Même exigence que le rattachement RSVP (mémoire « verified rsvp claims ») :
 * la possession du lien ne prouve rien. L'organisateur confirme une adresse
 * personnelle pour ce prestataire ; le compte doit avoir vérifié cette même
 * adresse. Un nom identique ne suffit jamais.
 *
 * Le rattachement porte sur le PRESTATAIRE dans ce Monde, pas sur un seul
 * lien : quand le saxophoniste rattache un Moment, tous ses liens de ce
 * Monde suivent — c'est la même personne, et une Carte ne peut être qu'une
 * seule contrepartie par Monde.
 */

export type ClaimableLink = {
  id: string;
  projectId: string;
  providerId: string;
  revoked: boolean;
  claimEmail: string | null;
  claimedCardUserId: string | null;
  claimedAt: unknown;
};

export function attestationClaimEligibility(input: {
  userId: string;
  hasCard: boolean;
  link: ClaimableLink;
  verifiedEmails: string[];
  /** Les liens de ce Monde (tous prestataires confondus). */
  siblings: ReadonlyArray<ClaimableLink>;
  providerExists: boolean;
  closed: boolean;
}): string | null {
  const { link } = input;
  if (link.revoked || !input.providerExists) return "Lien d'attestation invalide ou révoqué.";
  if (input.closed) return "Ce Monde est clôturé : le rattachement n'est plus possible.";
  if (!input.hasCard) return "Créez votre Carte Universelle avant de rattacher ces Moments.";
  if (link.claimedAt || link.claimedCardUserId) {
    return link.claimedCardUserId === input.userId ? null : "Ces Moments sont déjà rattachés à une autre carte.";
  }
  /* Une Carte = une contrepartie par Monde. */
  const otherProvider = input.siblings.find(item => !item.revoked && item.claimedCardUserId === input.userId && item.providerId !== link.providerId);
  if (otherProvider) return "Votre carte est déjà la contrepartie d'un autre professionnel dans ce Monde.";
  const intended = normalizedClaimEmail(link.claimEmail);
  const sameRecipientProviders = new Set(
    input.siblings.filter(item => !item.revoked && normalizedClaimEmail(item.claimEmail) === intended && intended).map(item => item.providerId),
  );
  if (!intended || sameRecipientProviders.size !== 1 || !input.verifiedEmails.some(email => normalizedClaimEmail(email) === intended)) {
    return "Rattachement refusé. Faites confirmer par l'organisateur une adresse personnelle unique pour vous, et vérifiez cette adresse dans votre compte.";
  }
  return null;
}

export type CountersignedMoment = {
  projectId: string;
  projectTitle: string;
  eventId: string;
  providerId: string;
  providerRole: string;
  title: string;
  time: number;
  endTime?: number;
  location?: string;
  amountCents: number;
  /** L'attestation courante couvre-t-elle encore le fait tel qu'il est ? */
  state: "atteste" | "conteste" | "perime" | "declare";
  attestedAt?: string;
};

/**
 * Les Moments d'une personne dans un Monde, tels que le Profil les lit :
 * pour chaque lien rattaché, le fait actuel et l'état de l'écriture de la
 * contrepartie. Ne montre RIEN du Monde au-delà du fait signé : pas les
 * invités, pas le budget, pas les autres prestataires.
 */
export function countersignedMoments(
  project: { id: string; title: string; data: unknown },
  links: ReadonlyArray<{ eventId: string; providerId: string; revoked: boolean }>,
  history: ReadonlyArray<{ eventId: string; providerId: string; status: string; hash: string; respondedAt: Date | string }>,
): CountersignedMoment[] {
  return links
    .filter(link => !link.revoked)
    .flatMap(link => {
      const event = findEvent(project.data, link.eventId);
      const provider = findProvider(project.data, link.providerId);
      const fact = buildFactView(project.data, link.eventId, link.providerId);
      if (!event || !provider || !fact) return [];
      const hash = factViewFingerprint(fact);
      const own = history
        .filter(item => item.eventId === link.eventId && item.providerId === link.providerId)
        .sort((a, b) => new Date(a.respondedAt).getTime() - new Date(b.respondedAt).getTime());
      const last = own[own.length - 1];
      const current = own.find(item => item.status === "atteste" && item.hash === hash);
      const state: CountersignedMoment["state"] = current
        ? "atteste"
        : last && last.status === "conteste" && last.hash === hash
          ? "conteste"
          : own.some(item => item.status === "atteste")
            ? "perime"
            : "declare";
      return [{
        projectId: project.id,
        projectTitle: project.title,
        eventId: link.eventId,
        providerId: link.providerId,
        providerRole: typeof provider.role === "string" ? provider.role : "",
        title: fact.title,
        time: fact.time,
        endTime: fact.endTime,
        location: fact.location,
        amountCents: fact.amountCents,
        state,
        attestedAt: current ? new Date(current.respondedAt).toISOString() : undefined,
      }];
    })
    .sort((a, b) => b.time - a.time);
}

/** Le résumé qu'un Profil peut afficher : ce que d'autres ont contresigné. */
export function profileProof(moments: ReadonlyArray<CountersignedMoment>) {
  const attested = moments.filter(item => item.state === "atteste");
  return {
    moments: moments.length,
    attested: attested.length,
    worlds: new Set(attested.map(item => item.projectId)).size,
    amountCents: attested.reduce((sum, item) => sum + item.amountCents, 0),
    since: attested.length ? Math.min(...attested.map(item => item.time)) : undefined,
  };
}
