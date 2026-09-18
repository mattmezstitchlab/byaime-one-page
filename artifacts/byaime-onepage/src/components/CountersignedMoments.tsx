import { useEffect, useState } from "react";
import { apiCall } from "@/lib/api-call";
import { formatCents } from "@/lib/money";
import { MOMENT_STATE_LABEL, formatMomentDate, type ClaimedMoment } from "./AttestationClaimPanel";

/*
 * Ce que la Carte montre de la personne sans qu'elle l'ait écrit : les
 * Moments que d'autres Mondes ont déclarés et qu'elle a contresignés.
 * Relus au serveur à chaque affichage — jamais copiés dans la carte.
 */

type Proof = { moments: number; attested: number; worlds: number; amountCents: number; since?: number };

export function CountersignedMoments({
  enabled,
  refreshToken = 0,
  onClaim,
}: {
  enabled: boolean;
  refreshToken?: number;
  onClaim(): void;
}) {
  const [moments, setMoments] = useState<ClaimedMoment[] | null>(null);
  const [proof, setProof] = useState<Proof | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    apiCall<{ moments: ClaimedMoment[]; proof: Proof }>("/me/attestations")
      .then((body) => {
        if (!active) return;
        setMoments(body.moments);
        setProof(body.proof);
      })
      .catch(() => {
        /* Le Profil sans ses attestations reste une carte complète : pas d'erreur bloquante. */
        if (active) setMoments([]);
      });
    return () => { active = false; };
  }, [enabled, refreshToken]);

  const attested = (moments ?? []).filter((m) => m.state === "atteste");
  const others = (moments ?? []).filter((m) => m.state !== "atteste");

  return (
    <section className="rounded-2xl border border-white/15 p-5" aria-label="Moments attestés" data-testid="countersigned-moments">
      <p className="text-[11px] uppercase tracking-[.16em] text-white/50">Partie double</p>
      <h3 className="mt-2 text-lg">Ce que d'autres Mondes ont attesté</h3>
      {proof && proof.attested > 0 ? (
        <p className="mt-2 text-sm text-white/65" data-testid="countersigned-proof">
          {proof.attested} Moment{proof.attested > 1 ? "s" : ""} attesté{proof.attested > 1 ? "s" : ""} dans {proof.worlds} Monde{proof.worlds > 1 ? "s" : ""}
          {proof.since ? ` depuis ${formatMomentDate(proof.since)}` : ""} · {formatCents(proof.amountCents)} réglés et contresignés.
        </p>
      ) : (
        <p className="mt-2 text-sm text-white/65">
          Votre Profil n'a pas à se raconter : quand un Monde écrit un Moment avec vous et que vous l'attestez, il apparaît ici, daté et empreinté.
        </p>
      )}
      {attested.length > 0 && (
        <ul className="mt-4 space-y-2">
          {attested.map((moment) => (
            <li key={`${moment.projectId}-${moment.eventId}`} className="rounded-xl border border-white/20 p-3 text-sm" data-testid="countersigned-moment" data-state={moment.state}>
              <p className="font-medium">{moment.title}</p>
              <p className="text-xs text-white/65">
                {moment.projectTitle}{moment.providerRole ? ` · ${moment.providerRole}` : ""}
              </p>
              <p className="text-xs text-white/65">
                {formatMomentDate(moment.time)}{moment.location ? ` · ${moment.location}` : ""} · {formatCents(moment.amountCents)}
              </p>
            </li>
          ))}
        </ul>
      )}
      {others.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {others.map((moment) => (
            <li key={`${moment.projectId}-${moment.eventId}`} className="text-xs text-white/50" data-testid="countersigned-moment" data-state={moment.state}>
              {moment.title} · {moment.projectTitle} · {MOMENT_STATE_LABEL[moment.state]}
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="mt-4 min-h-11 rounded-full border border-white/30 px-5 text-sm" onClick={onClaim} data-testid="countersigned-claim">
        Rattacher un lien d'attestation
      </button>
    </section>
  );
}
