import { useEffect, useState } from "react";
import { apiCall } from "@/lib/api-call";
import { factState, type FactState } from "@/lib/attestation";
import { PILL_SMALL, PILL_SMALL_GHOST } from "@/lib/site-design";
import { cn } from "@/lib/utils";
import type { Provider, TimelineEvent, WorldProject } from "@/lib/types";

/*
 * L'autre côté du Moment, vu depuis le Monde.
 *
 * Pour chaque Moment relié à un prestataire, le Monde voit dans quel état est
 * le fait vis-à-vis de cette contrepartie (déclaré, attesté, contesté, périmé)
 * et peut lui envoyer son lien. Il ne peut rien écrire à sa place : l'état
 * est dérivé de `project.attestations`, que seul le serveur prolonge.
 */

type AttestationLink = { eventId: string; providerId: string; token: string; revoked: boolean };

const STATE_LABEL: Record<FactState, string> = {
  declare: "Déclaré de votre côté",
  atteste: "Attesté des deux côtés",
  conteste: "Contesté par la contrepartie",
  perime: "À faire réattester : le fait a changé",
};

function attestationUrl(token: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";
  const root = base === "/" ? "" : base;
  return `${window.location.origin}${root}/attestation/${token}`;
}

export function useAttestationLinks(projectId: string | undefined, enabled: boolean) {
  const [links, setLinks] = useState<Record<string, AttestationLink>>({});
  const [available, setAvailable] = useState(true);
  const key = (eventId: string, providerId: string) => `${eventId}::${providerId}`;
  const refresh = async () => {
    if (!projectId || !enabled) return;
    try {
      const items = await apiCall<AttestationLink[]>(`/projects/${projectId}/attestation-links`);
      setLinks(Object.fromEntries(items.filter(item => !item.revoked).map(item => [key(item.eventId, item.providerId), item])));
      setAvailable(true);
    } catch {
      setAvailable(false);
    }
  };
  useEffect(() => { void refresh(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, enabled]);
  return { links, available, refresh, key };
}

export function CounterpartAttestation({
  event,
  provider,
  project,
  link,
  available,
  canManage,
  onChanged,
}: {
  event: TimelineEvent;
  provider: Provider;
  project: Pick<WorldProject, "id" | "documents" | "payments" | "attestations">;
  link?: AttestationLink;
  available: boolean;
  canManage: boolean;
  onChanged: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const state = factState(event, provider.id, project);
  const last = (project.attestations ?? [])
    .filter(item => item.eventId === event.id && item.providerId === provider.id)
    .sort((a, b) => b.respondedAt - a.respondedAt)[0];

  const request = async () => {
    setBusy(true);
    setNotice("");
    try {
      const created = await apiCall<AttestationLink>(`/projects/${project.id}/attestation-links/${encodeURIComponent(event.id)}/${encodeURIComponent(provider.id)}`, { method: "POST" });
      await onChanged();
      try {
        await navigator.clipboard.writeText(attestationUrl(created.token));
        setNotice("Lien créé et copié : envoyez-le à la contrepartie.");
      } catch {
        setNotice("Lien créé : copiez-le ci-dessous.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Lien impossible à créer.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(attestationUrl(link.token));
      setNotice("Lien copié.");
    } catch {
      setNotice("Copie impossible : sélectionnez le lien.");
    }
  };

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]" data-testid={`counterpart-${event.id}-${provider.id}`} data-fact-state={state}>
      <span
        className={cn(
          "rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest",
          state === "atteste" && "border-[var(--agency-ink)] text-[var(--agency-ink)]",
          state === "conteste" && "border-[#B42318]/50 text-[#B42318]",
          state === "perime" && "border-[var(--agency-hairline)] text-[var(--agency-body)]",
          state === "declare" && "border-[var(--agency-hairline)] text-[var(--agency-eyebrow)]",
        )}
      >
        {STATE_LABEL[state]}
      </span>
      {state === "conteste" && last?.note && <span className="italic text-[var(--agency-body)]">« {last.note} »</span>}
      {canManage && available && state !== "atteste" && (
        link ? (
          <>
            <button type="button" onClick={copy} className={cn(PILL_SMALL_GHOST, "text-[10px]")}>Copier le lien</button>
            <button type="button" disabled={busy} onClick={request} className={cn(PILL_SMALL_GHOST, "text-[10px]")}>Réémettre</button>
          </>
        ) : (
          <button type="button" data-testid={`counterpart-request-${event.id}-${provider.id}`} disabled={busy} onClick={request} className={cn(PILL_SMALL, "border border-[var(--agency-hairline)] text-[10px] hover:bg-[var(--agency-ink)] hover:text-[var(--agency-paper)]")}>
            Demander l'attestation
          </button>
        )
      )}
      {notice && <span role="status" className="text-[var(--agency-body)]">{notice}</span>}
    </div>
  );
}
