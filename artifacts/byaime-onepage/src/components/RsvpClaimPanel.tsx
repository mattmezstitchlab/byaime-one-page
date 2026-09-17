import { useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { invitationTarget } from "@/lib/invitation-target";
import { failureMessage } from "@/lib/api-messages";
import { apiCall } from "@/lib/api-call";

type Review = {
  projectId: string;
  projectTitle: string;
  guestName: string;
  alreadyClaimed: boolean;
};
/*
 * L'adresse de connexion d'une page publique, avec le retour ici même : le
 * lien d'invitation est conservé, la personne revient au même endroit.
 */
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function accountHref(path: "/connexion" | "/creation"): string {
  const returnTo = `${window.location.pathname}${window.location.search}`;
  return `${basePath}${path}?returnTo=${encodeURIComponent(returnTo)}`;
}

/*
 * Le conteneur de la vérification. Seul, le panneau pose un vrai <form> (Entrée
 * valide le lien) ; dans une étape, c'est un simple bloc — un formulaire
 * imbriqué n'existe pas en HTML.
 */
function Field({
  embedded,
  className,
  onSubmit,
  children,
}: {
  embedded: boolean;
  className?: string;
  onSubmit(): void;
  children: ReactNode;
}) {
  if (embedded) return <div className={className}>{children}</div>;
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
    </form>
  );
}

export function RsvpClaimPanel({
  initialToken = "",
  signedIn = true,
  embedded = false,
  onJoined,
  onClose,
}: {
  initialToken?: string;
  /**
   * Faux pour un visiteur : le panneau S'OUVRE quand même et dit, en une
   * phrase, qu'un compte est nécessaire — puis propose la connexion. Cacher le
   * panneau faisait d'un bouton d'invitation un bouton mort (17/09).
   */
  signedIn?: boolean;
  /**
   * Vrai quand le panneau s'affiche DANS le formulaire d'une étape (les cinq
   * questions du Oneboarding). Un <form> imbriqué est invalide : le « submit »
   * de l'invitation remontait jusqu'au parcours et déclenchait la question du
   * mariage (« Choisissez d'abord un mariage ») — l'erreur vue à cette étape
   * (17/09). Ici, la vérification est un bouton, pas un formulaire.
   */
  embedded?: boolean;
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
      /* Un lien injoignable ou refusé est nommé en français par `apiCall` :
         jamais le texte brut d'une réponse qui n'est pas du JSON. */
      const result = await apiCall<Review>(`/rsvp/${target.token}/claim`);
      setToken(target.token);
      setReview(result);
    } catch (e) {
      setError(failureMessage(e, "Validation impossible"));
    } finally {
      setBusy(false);
    }
  };
  const claim = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await apiCall<{ projectId: string }>(`/rsvp/${token}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed }),
      });
      await onJoined(result.projectId);
    } catch (e) {
      setError(failureMessage(e, "Association impossible"));
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
        {signedIn
          ? "Votre carte est déjà prête. Nous vérifions que l’invitation vous est destinée avant de la lui associer."
          : "Un compte est nécessaire : c’est lui qui garantit que l’invitation vous est destinée. Le lien seul ne suffit pas."}
      </p>
      {!signedIn ? (
        <div
          className="mt-6 space-y-4 rounded-2xl border border-white/20 bg-white/5 p-5"
          data-testid="rsvp-claim-account"
        >
          <p className="text-sm leading-relaxed text-white/75">
            Créez votre carte (une minute) ou connectez-vous : nous reviendrons
            ici même, avec votre lien d’invitation.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              data-testid="rsvp-claim-signin"
              href={accountHref("/connexion")}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Se connecter
            </a>
            <a
              data-testid="rsvp-claim-signup"
              href={accountHref("/creation")}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/30 px-5 text-sm transition hover:border-white/60"
            >
              Créer ma carte
            </a>
          </div>
        </div>
      ) : !review ? (
        <div
          className={embedded ? "mt-6 space-y-4" : undefined}
          data-testid="rsvp-claim-check"
        >
          {/* Imbriqué dans le formulaire de l'étape : un <form> ici serait
              invalide et ferait remonter le « submit » au parcours. */}
          <Field
            embedded={embedded}
            className={embedded ? undefined : "mt-6 space-y-4"}
            onSubmit={() => {
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
              type={embedded ? "button" : "submit"}
              className="min-h-11 rounded-full bg-white px-5 text-sm font-semibold text-black disabled:opacity-50"
              disabled={busy}
              onClick={embedded ? () => void check() : undefined}
            >
              {busy ? "Vérification…" : "Vérifier mon invitation"}
            </button>
          </Field>
        </div>
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
          <label className="flex gap-3 text-sm leading-relaxed" data-testid="rsvp-claim-confirm">
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
