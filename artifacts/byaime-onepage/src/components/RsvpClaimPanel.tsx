import { useState } from "react";
import { useLocation } from "wouter";
import { invitationTarget } from "@/lib/invitation-target";

type Review = {
  projectId: string;
  projectTitle: string;
  guestName: string;
  alreadyClaimed: boolean;
};
export function RsvpClaimPanel({
  initialToken = "",
  onJoined,
  onClose,
}: {
  initialToken?: string;
  onJoined(id: string): Promise<void>;
  onClose(): void;
}) {
  const [, navigate] = useLocation();
  const [value, setValue] = useState(initialToken),
    [review, setReview] = useState<Review | null>(null);
  const [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [token, setToken] = useState("");
  const check = async () => {
    const target = invitationTarget(value);
    if (!target) {
      setError("Collez un lien RSVP ou une invitation BYAIME valide.");
      return;
    }
    if (target.kind === "collaboration") {
      navigate(`/invite/${target.token}`);
      return;
    }
    setBusy(true);
    setError("");
    setReview(null);
    setConfirmed(false);
    try {
      const response = await fetch(`/api/rsvp/${target.token}/claim`);
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Validation impossible");
      setToken(target.token);
      setReview(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation impossible");
    } finally {
      setBusy(false);
    }
  };
  const claim = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/rsvp/${token}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Association impossible");
      await onJoined(result.projectId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Association impossible");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="rounded-[2rem] border border-white/15 bg-[#171410] p-6 text-white sm:p-8"
      data-testid="rsvp-claim-panel"
    >
      <button
        type="button"
        className="min-h-11 text-sm text-white/65"
        disabled={busy}
        onClick={onClose}
      >
        ← Ma carte
      </button>
      <p className="mt-4 text-[11px] uppercase tracking-[.2em] text-white/50">
        Une invitation, pas une nouvelle identité
      </p>
      <h2 className="mt-2 text-2xl">Rejoindre un mariage</h2>
      <p className="mt-3 text-sm leading-relaxed text-white/70">
        Votre carte est déjà prête. Nous vérifions que l’invitation vous est
        destinée avant de la lui associer.
      </p>
      {!review ? (
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void check();
          }}
        >
          <label className="block text-sm">
            Lien d’invitation
            <input
              className="mt-2 min-h-12 w-full rounded-xl border border-white/25 bg-white/5 px-3"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
              placeholder="Collez le lien reçu de l’organisateur"
              required
            />
          </label>
          <button
            type="submit"
            className="min-h-11 rounded-full bg-white px-5 text-sm font-semibold text-black disabled:opacity-50"
            disabled={busy}
          >
            {busy ? "Vérification…" : "Vérifier mon invitation"}
          </button>
        </form>
      ) : (
        <div className="mt-6 space-y-4 rounded-2xl border border-white/20 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-widest text-green-200">
            Adresse vérifiée · Invitation validée
          </p>
          <h3 className="text-lg">{review.projectTitle}</h3>
          <p className="text-sm text-white/70">
            Invitation : {review.guestName}
          </p>
          <p className="text-sm text-white/70">
            {review.alreadyClaimed
              ? "Cette invitation est déjà associée à votre carte."
              : "Vos réponses RSVP existantes sont conservées. Leur rattachement ne crée ni nouveau profil ni copie de ces réponses."}
          </p>
          <label className="flex gap-3 text-sm leading-relaxed">
            <input
              type="checkbox"
              className="mt-1"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Je confirme que cette invitation m’est destinée et souhaite la
            rattacher à ma Carte Universelle. L’accès à ce portail sera réservé
            à mon compte.
          </label>
          <button
            type="button"
            disabled={!confirmed || busy}
            className="min-h-11 rounded-full bg-white px-5 text-sm font-semibold text-black disabled:opacity-50"
            onClick={() => void claim()}
          >
            {busy ? "Association…" : "Associer cette invitation à ma carte"}
          </button>
          <button
            type="button"
            className="block min-h-11 text-sm underline"
            disabled={busy}
            onClick={() => setReview(null)}
          >
            Utiliser une autre invitation
          </button>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-300/30 p-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}
      <p className="mt-5 text-xs leading-relaxed text-white/50">
        Seule une adresse personnelle confirmée par l’organisateur et vérifiée
        dans votre compte peut autoriser ce rattachement. Un nom identique ou la
        possession du lien ne suffisent pas. Vous pouvez continuer à répondre
        anonymement tant que l’invitation n’est pas rattachée.
      </p>
    </section>
  );
}
