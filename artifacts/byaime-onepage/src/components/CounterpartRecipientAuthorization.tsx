import { useState } from "react";
import { apiCall } from "@/lib/api-call";

/*
 * L'organisateur confirme l'adresse PERSONNELLE de la contrepartie : c'est ce
 * qui autorisera, plus tard, le rattachement de ses Moments à sa Carte. Un
 * contact dans la fiche ne vaut jamais confirmation ; l'action est explicite,
 * et une seule adresse par professionnel dans ce Monde.
 */
export function CounterpartRecipientAuthorization({
  projectId,
  providerId,
  claimEmail,
  claimedAt,
  onSaved,
}: {
  projectId: string;
  providerId: string;
  claimEmail?: string | null;
  claimedAt?: string | null;
  onSaved(): Promise<unknown> | unknown;
}) {
  const [email, setEmail] = useState(claimEmail ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (claimedAt)
    return (
      <p className="mt-2 text-[11px] text-[var(--agency-body)]" data-testid={`counterpart-claimed-${providerId}`}>
        Moments rattachés à une carte vérifiée. Aucun transfert automatique.
      </p>
    );
  return (
    <details className="mt-2 rounded-xl border border-[var(--agency-hairline)] p-3 text-[11px]" data-testid={`counterpart-recipient-${providerId}`}>
      <summary className="min-h-8 cursor-pointer font-medium">
        {claimEmail ? "Adresse de rattachement confirmée" : "Autoriser le rattachement à sa carte"}
      </summary>
      <form
        className="mt-3 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            await apiCall(`/projects/${projectId}/attestation-links/${encodeURIComponent(providerId)}/claim-recipient`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, confirmed }),
            });
            await onSaved();
            setMessage("Adresse confirmée. La personne devra aussi la vérifier dans son compte.");
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Confirmation impossible");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block">
          Adresse personnelle de ce professionnel
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setConfirmed(false);
            }}
            className="mt-1 min-h-10 w-full rounded-lg border border-[var(--agency-hairline)] bg-transparent px-3"
          />
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" required checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          Je confirme que cette adresse personnelle est celle de ce professionnel uniquement. Le lien seul ne donnera pas accès à sa carte.
        </label>
        <button className="min-h-10 rounded-full border border-[var(--agency-hairline)] px-4 disabled:opacity-40" disabled={busy || !confirmed} type="submit">
          Confirmer la contrepartie
        </button>
        {message && <p role="status">{message}</p>}
      </form>
    </details>
  );
}
