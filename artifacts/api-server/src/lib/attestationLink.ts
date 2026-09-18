import { buildFactView, eventRelatesProvider, factViewFingerprint, findEvent, findProvider, type FactView } from "@workspace/aime-domain";
import { z } from "zod";

/*
 * Partie double, côté serveur — la logique pure, sans base :
 *  - on ne demande une attestation qu'à une contrepartie RÉELLE (le Moment
 *    relie ce prestataire, le Moment n'est pas une suggestion) ;
 *  - la contrepartie répond sur le fait tel qu'il lui est montré : le serveur
 *    recalcule la vue et son empreinte À LA RÉPONSE, jamais à partir du
 *    client, et refuse si l'empreinte annoncée par le client n'est plus celle
 *    du fait (le fait a bougé entre l'affichage et le clic) ;
 *  - une attestation porte sur le fait, jamais sur la qualité : la note d'une
 *    contestation est courte et facultative.
 */

export const attestationResponseSchema = z
  .object({
    status: z.enum(["atteste", "conteste"]),
    /** L'empreinte du fait que la contrepartie a vu. */
    hash: z.string().regex(/^[0-9a-f]{8}$/),
    note: z.string().trim().max(280).optional(),
  })
  .strict();

export type AttestationResponseInput = z.infer<typeof attestationResponseSchema>;

export type CounterpartCheck =
  | { ok: true; providerName: string }
  | { ok: false; reason: "event" | "provider" | "relation" | "suggested" };

/** Peut-on demander à ce prestataire d'attester ce Moment ? */
export function checkCounterpart(data: unknown, eventId: string, providerId: string): CounterpartCheck {
  const event = findEvent(data, eventId);
  if (!event) return { ok: false, reason: "event" };
  const provider = findProvider(data, providerId);
  if (!provider) return { ok: false, reason: "provider" };
  if (event.provenance === "suggested") return { ok: false, reason: "suggested" };
  if (!eventRelatesProvider(event, providerId)) return { ok: false, reason: "relation" };
  const name = typeof provider.name === "string" && provider.name.trim() ? provider.name : String(provider.role ?? "");
  return { ok: true, providerName: name };
}

export type AttestationPortal = {
  projectTitle: string;
  providerName: string;
  fact: FactView;
  hash: string;
  history: Array<{ status: string; hash: string; respondedAt: string; amountCents: number; note?: string | null }>;
  /** Le fait actuel est-il déjà couvert par une signature ? */
  attested: boolean;
};

/** Ce que voit la contrepartie en ouvrant son lien : le fait, son empreinte, ses réponses passées. */
export function buildAttestationPortal(
  data: unknown,
  projectTitle: string,
  eventId: string,
  providerId: string,
  history: AttestationPortal["history"],
): AttestationPortal | undefined {
  const check = checkCounterpart(data, eventId, providerId);
  const fact = buildFactView(data, eventId, providerId);
  if (!check.ok || !fact) return undefined;
  const hash = factViewFingerprint(fact);
  return {
    projectTitle,
    providerName: check.providerName,
    fact,
    hash,
    history,
    attested: history.some(item => item.status === "atteste" && item.hash === hash),
  };
}

export type ResponseDecision =
  | { ok: true; fact: FactView; hash: string }
  | { ok: false; status: 404 | 409; error: string };

/**
 * La réponse ne vaut que pour le fait actuel : si l'empreinte envoyée n'est
 * plus celle du fait, le fait a changé depuis l'affichage — on refuse et on
 * demande de relire. On ne signe jamais à l'aveugle.
 */
export function decideResponse(data: unknown, eventId: string, providerId: string, input: AttestationResponseInput): ResponseDecision {
  const check = checkCounterpart(data, eventId, providerId);
  const fact = buildFactView(data, eventId, providerId);
  if (!check.ok || !fact) return { ok: false, status: 404, error: "Ce Moment n'existe plus dans ce Monde." };
  const hash = factViewFingerprint(fact);
  if (hash !== input.hash) {
    return { ok: false, status: 409, error: "Ce Moment a changé depuis votre lecture. Relisez-le avant de répondre." };
  }
  return { ok: true, fact, hash };
}

/** Une réponse identique à la dernière sur le même fait n'écrit rien : le journal reste propre. */
export function isDuplicateResponse(
  history: ReadonlyArray<{ status: string; hash: string }>,
  input: Pick<AttestationResponseInput, "status" | "hash">,
): boolean {
  const last = history[history.length - 1];
  return Boolean(last && last.status === input.status && last.hash === input.hash);
}
