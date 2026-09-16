import { useState } from "react";
/** Explicit organizer action: a contact/name alone never authorizes a claim. */
export function RsvpRecipientAuthorization({
  projectId,
  guestId,
  contact,
  claimEmail,
  claimedAt,
  onSaved,
}: {
  projectId: string;
  guestId: string;
  contact?: string;
  claimEmail?: string | null;
  claimedAt?: string | null;
  onSaved(): Promise<unknown>;
}) {
  const [email, setEmail] = useState(claimEmail ?? contact ?? ""),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  if (claimedAt)
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        Invitation rattachée à une carte vérifiée. Aucun transfert automatique.
      </p>
    );
  return (
    <details className="mt-3 rounded-xl border border-foreground/15 p-3 text-xs">
      <summary className="min-h-8 cursor-pointer font-medium">
        {claimEmail
          ? "Adresse de rattachement confirmée"
          : "Autoriser le rattachement à une carte"}
      </summary>
      <form
        className="mt-3 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            const response = await fetch(
              `/api/projects/${projectId}/rsvp-links/${encodeURIComponent(guestId)}/claim-recipient`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, confirmed }),
              },
            );
            const body = await response.json();
            if (!response.ok)
              throw new Error(body.error || "Confirmation impossible");
            await onSaved();
            setMessage(
              "Adresse confirmée. La personne devra aussi la vérifier dans son compte.",
            );
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : "Confirmation impossible",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block">
          Adresse personnelle du destinataire
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setConfirmed(false);
            }}
            className="mt-1 min-h-11 w-full rounded-lg border bg-transparent px-3"
          />
        </label>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            required
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          Je confirme que cette adresse personnelle est destinée à cet invité
          uniquement. Le lien seul ne donnera pas accès au compte.
        </label>
        <button
          className="min-h-11 rounded-full border px-4 disabled:opacity-40"
          disabled={busy || !confirmed}
          type="submit"
        >
          Confirmer le destinataire
        </button>
        {message && <p role="status">{message}</p>}
      </form>
    </details>
  );
}
