import { useEffect, useState } from "react";
import { invitationTarget } from "@/lib/invitation-target";
import { failureMessage } from "@/lib/api-messages";
import { apiCall } from "@/lib/api-call";
import { formatCents } from "@/lib/money";

/*
 * LE PROFIL QUI NAÎT REMPLI.
 *
 * Un prestataire a attesté un Moment depuis son lien, sans compte. S'il a une
 * Carte, il peut y rattacher ses Moments de ce Monde : ce n'est pas lui qui
 * les raconte, c'est un Monde qui les a écrits et lui qui les a contresignés.
 *
 * Mêmes garanties que le rattachement d'une invitation : le lien seul ne
 * prouve rien, l'organisateur confirme une adresse personnelle, le compte
 * doit l'avoir vérifiée. Rien n'est copié dans la Carte — le Profil relit
 * les Moments depuis le Monde, à l'instant.
 */

export type ClaimedMoment = {
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
  state: "atteste" | "conteste" | "perime" | "declare";
  attestedAt?: string;
};

type Review = {
  projectId: string;
  projectTitle: string;
  providerRole: string;
  moments: ClaimedMoment[];
  alreadyClaimed: boolean;
};

export const MOMENT_STATE_LABEL: Record<ClaimedMoment["state"], string> = {
  atteste: "Attesté des deux côtés",
  conteste: "Contesté par vous",
  perime: "À réattester : le fait a changé",
  declare: "Déclaré par le Monde, pas encore attesté",
};

export const formatMomentDate = (value: number) =>
  new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function AttestationClaimPanel({
  initialToken = "",
  onJoined,
  onClose,
}: {
  initialToken?: string;
  onJoined(projectId: string): Promise<void> | void;
  onClose(): void;
}) {
  const [value, setValue] = useState(initialToken);
  const [review, setReview] = useState<Review | null>(null);
  const [token, setToken] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const check = async (raw = value) => {
    const target = invitationTarget(raw);
    if (!target || target.kind !== "attestation") {
      setError("Collez un lien d'attestation BYAIME valide.");
      return;
    }
    setBusy(true);
    setError("");
    setReview(null);
    setConfirmed(false);
    try {
      const result = await apiCall<Review>(`/attestation/${target.token}/claim`);
      setToken(target.token);
      setReview(result);
    } catch (e) {
      setError(failureMessage(e, "Vérification impossible"));
    } finally {
      setBusy(false);
    }
  };

  /* Arrivée depuis la page d'attestation : le lien est déjà là, on vérifie. */
  useEffect(() => {
    if (initialToken) void check(initialToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const claim = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await apiCall<Review>(`/attestation/${token}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed }),
      });
      await onJoined(result.projectId);
    } catch (e) {
      setError(failureMessage(e, "Rattachement impossible"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-[2rem] border border-white/15 bg-[#171410] p-6 text-white sm:p-8" data-testid="attestation-claim-panel">
      <button type="button" className="min-h-11 text-sm text-white/65" disabled={busy} onClick={onClose}>
        ← Ma carte
      </button>
      <p className="mt-4 text-[11px] uppercase tracking-[.2em] text-white/50">Partie double</p>
      <h2 className="mt-2 text-2xl">Rattacher mes Moments attestés</h2>
      <p className="mt-3 text-sm leading-relaxed text-white/70">
        Un Monde a écrit ce que vous avez fait ; vous l'avez contresigné. Rattachés à votre carte, ces Moments deviennent votre Profil — non pas ce que vous racontez, mais ce que d'autres ont attesté.
      </p>
      {!review ? (
        <form
          className="mt-6 space-y-4"
          data-testid="attestation-claim-check"
          onSubmit={(e) => {
            e.preventDefault();
            void check();
          }}
        >
          <label className="block text-sm">
            Lien d'attestation
            <input
              className="mt-2 min-h-12 w-full rounded-xl border border-white/25 bg-white/5 px-3"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
              placeholder="Collez le lien reçu de l'organisateur"
              required
            />
          </label>
          <button type="submit" className="min-h-11 rounded-full bg-white px-5 text-sm font-semibold text-black disabled:opacity-50" disabled={busy}>
            {busy ? "Vérification…" : "Vérifier ce lien"}
          </button>
        </form>
      ) : (
        <div className="mt-6 space-y-4 rounded-2xl border border-white/20 bg-white/5 p-5" data-testid="attestation-claim-review">
          <p className="text-xs uppercase tracking-widest text-green-200">Adresse vérifiée · Contrepartie reconnue</p>
          <h3 className="text-lg">{review.projectTitle}</h3>
          {review.providerRole && <p className="text-sm text-white/70">Vous y êtes : {review.providerRole}</p>}
          <ul className="space-y-2 text-sm" data-testid="attestation-claim-moments">
            {review.moments.map((moment) => (
              <li key={moment.eventId} className="rounded-xl border border-white/15 p-3" data-state={moment.state}>
                <p className="font-medium">{moment.title}</p>
                <p className="text-xs text-white/65">
                  {formatMomentDate(moment.time)}{moment.location ? ` · ${moment.location}` : ""} · {formatCents(moment.amountCents)}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-white/50">{MOMENT_STATE_LABEL[moment.state]}</p>
              </li>
            ))}
          </ul>
          <p className="text-sm text-white/70">
            {review.alreadyClaimed
              ? "Ces Moments sont déjà rattachés à votre carte."
              : "Rien n'est copié : votre carte relira ces Moments depuis le Monde. Si un fait change, sa signature se périme d'elle-même."}
          </p>
          {!review.alreadyClaimed && (
            <>
              <label className="flex gap-3 text-sm leading-relaxed" data-testid="attestation-claim-confirm">
                <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                Je confirme être cette contrepartie et souhaite rattacher ces Moments à ma Carte Universelle.
              </label>
              <button
                type="button"
                data-testid="attestation-claim-submit"
                disabled={!confirmed || busy}
                className="min-h-11 rounded-full bg-white px-5 text-sm font-semibold text-black disabled:opacity-50"
                onClick={() => void claim()}
              >
                {busy ? "Rattachement…" : "Rattacher ces Moments à ma carte"}
              </button>
            </>
          )}
          <button type="button" className="block min-h-11 text-sm underline" disabled={busy} onClick={() => setReview(null)}>
            Utiliser un autre lien
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-red-300/30 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
      <p className="mt-5 text-xs leading-relaxed text-white/50">
        Seule une adresse personnelle confirmée par l'organisateur et vérifiée dans votre compte autorise ce rattachement. Un nom identique ou la possession du lien ne suffisent pas. Vous pouvez continuer à attester anonymement tant que rien n'est rattaché.
      </p>
    </section>
  );
}
