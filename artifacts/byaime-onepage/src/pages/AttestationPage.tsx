import { useEffect, useState } from "react";
import type { FactView } from "@workspace/aime-domain";
import { BODY, CARD, EYEBROW, FIELD, PILL_GHOST, PILL_INK, TITLE } from "@/lib/site-design";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/money";

/*
 * LA PAGE DE LA CONTREPARTIE.
 *
 * Un prestataire ouvre son lien et voit UN fait : ce Moment, à cette date, à
 * cet endroit, pour ce montant réglé. Deux réponses possibles, et rien
 * d'autre : « C'est exact » ou « Ce n'est pas ça ». Aucune note, aucune
 * étoile, aucun commentaire libre sur la qualité — une contestation dit en
 * une phrase ce qui diffère, c'est tout.
 *
 * Aucun compte : comme le RSVP, la page ne consomme ni Clerk ni le magasin
 * du projet. La réponse envoie l'empreinte du fait lu ; si le fait a bougé
 * entre-temps, le serveur refuse et la page se recharge pour montrer le
 * nouveau fait. On ne signe jamais à l'aveugle.
 */

type Portal = {
  projectTitle: string;
  providerName: string;
  fact: FactView;
  hash: string;
  attested: boolean;
  history: Array<{ status: string; hash: string; respondedAt: string; amountCents: number; note?: string | null }>;
};

const formatDate = (value: number) =>
  new Date(value).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
const formatTime = (value: number) => new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

/* Le chemin vers la Carte, en passant par la connexion : le lien est gardé,
   la personne revient sur sa carte avec ses Moments à rattacher. */
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const claimHref = (token: string) => `${basePath}/connexion?returnTo=${encodeURIComponent(`/ma-carte?attestation=${token}`)}`;

export function AttestationPage({ params }: { params: { token: string } }) {
  const [portal, setPortal] = useState<Portal | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "submitting" | "error">("loading");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [contesting, setContesting] = useState(false);
  const [note, setNote] = useState("");

  const load = async () => {
    const response = await fetch(`/api/attestation/${params.token}`);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Ce lien n'est plus valide.");
    setPortal(body as Portal);
  };

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setError("");
    void load()
      .then(() => { if (active) setStatus("ready"); })
      .catch(reason => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Ce lien n'est plus valide.");
        setStatus("error");
      });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token]);

  const respond = async (decision: "atteste" | "conteste") => {
    if (!portal || status !== "ready") return;
    setStatus("submitting");
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/attestation/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision, hash: portal.hash, ...(decision === "conteste" && note.trim() ? { note: note.trim() } : {}) }),
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 409) {
        setMessage(body.error || "Ce Moment a changé depuis votre lecture.");
        await load();
        setStatus("ready");
        return;
      }
      if (!response.ok) throw new Error(body.error || "Réponse impossible pour le moment.");
      await load();
      setContesting(false);
      setNote("");
      setMessage(decision === "atteste" ? "Merci. Ce Moment est maintenant attesté des deux côtés." : "C'est noté. Le Monde verra que ce Moment est contesté, avec votre phrase.");
      setStatus("ready");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Réponse impossible pour le moment.");
      setStatus("ready");
    }
  };

  if (status === "error") {
    return (
      <main data-testid="attestation-page" data-attestation-state="error" className="grid min-h-[100dvh] place-items-center bg-[var(--agency-paper)] p-6 text-center text-[var(--agency-ink)]">
        <div className="max-w-sm">
          <p className={EYEBROW}>Attestation</p>
          <p data-testid="attestation-error" className="mt-4 text-destructive">{error}</p>
          <button type="button" className={cn(PILL_GHOST, "mt-5")} onClick={() => window.location.reload()}>Réessayer</button>
        </div>
      </main>
    );
  }

  const fact = portal?.fact;
  const last = portal?.history[portal.history.length - 1];
  const contested = Boolean(last && last.status === "conteste" && last.hash === portal?.hash);

  return (
    <main data-testid="attestation-page" data-attestation-state={status} className="min-h-[100dvh] bg-[var(--agency-paper)] p-5 pb-14 pt-8 text-[var(--agency-ink)] md:p-10">
      <div className="mx-auto max-w-xl">
        <header className="mb-7">
          <p className={EYEBROW}>Attestation · partie double</p>
          <h1 data-testid="attestation-title" className={cn(TITLE, "mt-3 text-3xl")}>{portal?.projectTitle ?? "Un Moment à confirmer"}</h1>
          <p className={cn(BODY, "mt-3 text-sm")}>
            {portal ? <>Bonjour {portal.providerName}. Ce Monde a écrit ce Moment de son côté. Il ne devient un fait que si vous l'écrivez aussi.</> : "Chargement…"}
          </p>
        </header>

        {fact && (
          <section className={cn(CARD, "p-7")} data-testid="attestation-fact" data-hash={portal?.hash}>
            <p className={EYEBROW}>Le fait, tel qu'il vous est montré</p>
            <h2 className="mt-3 text-xl font-medium">{fact.title}</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div><dt className="text-[var(--agency-eyebrow)]">Quand</dt><dd className="mt-0.5">{formatDate(fact.time)}{fact.endTime ? ` → ${formatTime(fact.endTime)}` : ""}</dd></div>
              {fact.location && <div><dt className="text-[var(--agency-eyebrow)]">Où</dt><dd className="mt-0.5">{fact.location}</dd></div>}
              <div>
                <dt className="text-[var(--agency-eyebrow)]">Réglé pour ce Moment</dt>
                <dd className="mt-0.5 font-mono" data-testid="attestation-amount">{formatCents(fact.amountCents)}</dd>
                {fact.paymentIds.length === 0 && <dd className="mt-1 text-xs text-[var(--agency-eyebrow)]">Aucun règlement n'est encore rapproché de ce Moment.</dd>}
              </div>
            </dl>
            <p className="mt-4 font-mono text-[10px] text-[var(--agency-eyebrow)]">empreinte {portal?.hash}</p>

            {portal?.attested ? (
              <p data-testid="attestation-state" data-state="atteste" className="mt-6 rounded-2xl border border-[var(--agency-ink)] p-4 text-sm">
                Vous avez attesté ce Moment tel qu'il est. Si le Monde le modifie, il vous sera redemandé.
              </p>
            ) : contested ? (
              <div data-testid="attestation-state" data-state="conteste" className="mt-6 rounded-2xl border border-[#B42318]/40 p-4 text-sm">
                <p>Vous avez contesté ce Moment tel qu'il est.{last?.note ? ` « ${last.note} »` : ""}</p>
                <p className="mt-2 text-xs text-[var(--agency-body)]">Si le Monde le corrige, vous pourrez l'attester ici.</p>
                <button type="button" data-testid="attestation-accept" disabled={status !== "ready"} onClick={() => respond("atteste")} className={cn(PILL_GHOST, "mt-3")}>Finalement, c'est exact</button>
              </div>
            ) : (
              <div className="mt-6" data-testid="attestation-state" data-state="declare">
                {!contesting ? (
                  <div className="flex flex-wrap gap-3">
                    <button type="button" data-testid="attestation-accept" disabled={status !== "ready"} onClick={() => respond("atteste")} className={PILL_INK}>C'est exact</button>
                    <button type="button" data-testid="attestation-contest" disabled={status !== "ready"} onClick={() => setContesting(true)} className={PILL_GHOST}>Ce n'est pas ça</button>
                  </div>
                ) : (
                  <form
                    className="space-y-3"
                    onSubmit={event => { event.preventDefault(); void respond("conteste"); }}
                  >
                    <label className="block text-xs text-[var(--agency-body)]" htmlFor="attestation-note">
                      Qu'est-ce qui diffère ? Une phrase sur le fait (date, montant, lieu) — pas sur la qualité.
                    </label>
                    <input id="attestation-note" data-testid="attestation-note" value={note} onChange={event => setNote(event.target.value)} maxLength={280} placeholder="Par exemple : le cachet était de 200 €, pas 150 €." className={FIELD} />
                    <div className="flex flex-wrap gap-3">
                      <button type="submit" data-testid="attestation-contest-confirm" disabled={status !== "ready"} className={PILL_INK}>Envoyer la contestation</button>
                      <button type="button" onClick={() => { setContesting(false); setNote(""); }} className={PILL_GHOST}>Annuler</button>
                    </div>
                  </form>
                )}
              </div>
            )}
            {message && <p data-testid="attestation-message" role="status" className="mt-4 text-sm text-[var(--agency-body)]">{message}</p>}
            {error && <p data-testid="attestation-error" className="mt-4 text-sm text-destructive">{error}</p>}
          </section>
        )}

        {portal && portal.history.length > 0 && (
          <section className="mt-6">
            <p className={EYEBROW}>Vos écritures</p>
            <ul className="mt-3 space-y-1.5" data-testid="attestation-history">
              {[...portal.history].reverse().map((entry, index) => (
                <li key={`${entry.respondedAt}-${index}`} className="flex flex-wrap items-center gap-x-2 text-xs text-[var(--agency-body)]">
                  <span className="font-mono text-[10px] text-[var(--agency-eyebrow)]">{new Date(entry.respondedAt).toLocaleDateString("fr-FR")}</span>
                  <span className="rounded-full border border-[var(--agency-hairline)] px-2 py-0.5 text-[9px] uppercase tracking-widest">{entry.status === "atteste" ? "exact" : "contesté"}</span>
                  <span className="font-mono text-[10px]">{formatCents(entry.amountCents)}</span>
                  <span className="font-mono text-[9px] text-[var(--agency-eyebrow)]">{entry.hash}</span>
                  {entry.note && <span className="italic">« {entry.note} »</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {portal && (
          <section className="mt-8 rounded-2xl border border-[var(--agency-hairline)] p-5" data-testid="attestation-claim-invite">
            <p className={EYEBROW}>Votre Profil, écrit par d'autres</p>
            <p className={cn(BODY, "mt-2 text-sm")}>
              Avec une Carte Universelle, ce Moment attesté devient une ligne de votre Profil — datée, empreintée, contresignée par ce Monde. Rien à raconter : c'est déjà écrit.
            </p>
            <a href={claimHref(params.token)} className={cn(PILL_GHOST, "mt-4 inline-flex")} data-testid="attestation-claim-link">
              Rattacher à ma carte
            </a>
            <p className="mt-3 text-xs text-[var(--agency-eyebrow)]">
              L'organisateur doit avoir confirmé votre adresse personnelle ; votre compte doit l'avoir vérifiée. Le lien seul ne suffit pas.
            </p>
          </section>
        )}

        <p className="mt-8 text-xs leading-relaxed text-[var(--agency-eyebrow)]">
          Une attestation porte sur le fait — date, lieu, montant réglé — jamais sur la qualité. Elle reste la vôtre : le Monde ne peut ni l'écrire, ni la modifier, ni l'effacer.
        </p>
      </div>
    </main>
  );
}
