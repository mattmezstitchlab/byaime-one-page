
/*
 * Pont entre la mini-carte personne (timeline, régie, vue Personnes) et les
 * panneaux du Monde. Le brouillon survit à l'ouverture du panneau : la carte
 * le dépose AVANT que le module Messages ne soit monté, le module le consomme
 * à son montage. Aucun état global, juste un slot + deux événements.
 */

export type MessageDraftRequest = {
  recipients: string;
  subject: string;
  body: string;
};

let pendingDraft: MessageDraftRequest | null = null;

export const MESSAGE_TO_EVENT = "aime:message-to";

/** Ouvre le module Messages avec le composer libre pré-rempli. */
export function requestMessage(draft: MessageDraftRequest) {
  pendingDraft = draft;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(MESSAGE_TO_EVENT));
}

/** Lu par le module Messages à son montage (et à chaque événement). */
export function consumeMessageDraft(): MessageDraftRequest | null {
  const draft = pendingDraft;
  pendingDraft = null;
  return draft;
}
