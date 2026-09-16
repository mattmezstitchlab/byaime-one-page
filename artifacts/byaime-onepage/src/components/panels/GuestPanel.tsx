import { RsvpRecipientAuthorization } from "@/components/RsvpRecipientAuthorization";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Copy, ExternalLink, Link2, Plus, Search, Trash2, UserRoundPlus, X } from "lucide-react";
import { useProject } from "@/store/project-store";
import type { ParticipantLink } from "@/lib/types";
import { effectiveGuestDietary, effectiveGuestRsvp } from "@/lib/participant-rsvp";
import { momentGuestIds } from "@/lib/moment-context";
import { CARD, EYEBROW, PILL_SMALL, PILL_SMALL_GHOST, PILL_SMALL_INK } from "@/lib/site-design";
import { cn } from "@/lib/utils";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || `Erreur ${response.status}`);
  return body as T;
}

function participantUrl(token: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";
  const root = base === "/" ? "" : base;
  return `${window.location.origin}${root}/rsvp/${token}`;
}

export function GuestPanel({ momentId = null }: { momentId?: string | null } = {}) {
  const {
    project,
    participantLinks: links,
    refreshParticipantLinks,
    updateEntity,
    addEntity,
    removeEntity,
    canEdit,
    currentRole } = useProject();
  const [query, setQuery] = useState("");
  const [busyGuestId, setBusyGuestId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [apiAvailable, setApiAvailable] = useState(true);
  const canInviteParticipants = currentRole === "owner" || currentRole === "planner";
  const projectId = project?.id;
  const confirmedCount = useMemo(
    () => project?.guests.filter(guest => links[guest.id]?.response?.status === "confirmed" || (!links[guest.id]?.response && guest.rsvp === "confirme")).length ?? 0,
    [links, project?.guests],
  );

  useEffect(() => {
    if (!projectId || !canInviteParticipants) return;
    let active = true;
    setNotice("");
    void refreshParticipantLinks()
      .then(() => {
        if (active) setApiAvailable(true);
      })
      .catch(() => {
        if (!active) return;
        setApiAvailable(false);
        setNotice("Mode hors-ligne: gestion locale uniquement — liens RSVP indisponibles sans backend. Les invités, tables et présences restent modifiables.");
      });
    return () => {
      active = false;
    };
  }, [canInviteParticipants, projectId, refreshParticipantLinks]);

  if (!project) return null;
  /* Ancrage Moment : les personnes reliées à ce Moment passent en tête. */
  const linkedGuestIds = momentId ? momentGuestIds(project, momentId) : [];
  const guests = project.guests
    .filter(guest => `${guest.name} ${effectiveGuestDietary(guest, links[guest.id])}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(linkedGuestIds.includes(b.id)) - Number(linkedGuestIds.includes(a.id)));

  const createParticipantLink = async (guestId: string) => {
    if (!apiAvailable) {
      setNotice("Mode hors-ligne: lien RSVP indisponible sans backend.");
      return;
    }
    setBusyGuestId(guestId);
    setNotice("");
    try {
      const link = await api<ParticipantLink>(`/projects/${project.id}/rsvp-links/${guestId}`, { method: "POST" });
      await refreshParticipantLinks();
      updateEntity("guests", guestId, { invitationSent: true });
      try {
        await navigator.clipboard.writeText(participantUrl(link.token));
        setNotice("Lien RSVP personnel créé et copié. Il ne donne aucun accès au Monde.");
      } catch {
        setNotice("Lien RSVP personnel créé. Ouvrez-le pour le partager ; il ne donne aucun accès au Monde.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Impossible de créer le lien RSVP");
    } finally {
      setBusyGuestId(null);
    }
  };

  const copyParticipantLink = async (link: ParticipantLink) => {
    try {
      await navigator.clipboard.writeText(participantUrl(link.token));
      setNotice("Lien RSVP personnel copié.");
    } catch {
      setNotice("Le lien n’a pas pu être copié sur cet appareil.");
    }
  };

  const revokeParticipantLink = async (guestId: string) => {
    setBusyGuestId(guestId);
    setNotice("");
    try {
      await api(`/projects/${project.id}/rsvp-links/${guestId}`, { method: "DELETE" });
      await refreshParticipantLinks();
      updateEntity("guests", guestId, { invitationSent: false });
      setNotice("Lien RSVP révoqué. La personne ne peut plus l’utiliser.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Impossible de révoquer le lien RSVP");
    } finally {
      setBusyGuestId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header carte — même langage que le reste des panneaux */}
      <div className={cn(CARD, "p-6")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className={EYEBROW}>Droit · Participation</p>
            <h3 className="aime-apple-title mt-2 text-2xl text-[var(--agency-ink)]">Inviter à participer</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--agency-body)]">
              Chaque personne reçoit son propre lien RSVP pour répondre à l’événement. Ce lien ne crée pas de compte et ne donne aucun accès au Monde.
            </p>
            {!apiAvailable && (
              <p className="mt-3 rounded-xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-2 text-xs text-[var(--agency-eyebrow)]">
                Mode one-page hors-ligne: pas de backend détecté. Vous pouvez gérer noms, régimes, tables et présences localement. Les liens RSVP seront disponibles avec api-server.
              </p>
            )}
          </div>
          {canInviteParticipants && (
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new Event("aime:close-world-panel"));
                window.requestAnimationFrame(() => window.dispatchEvent(new Event("aime:open-collaboration-invite")));
              }}
              className={cn(PILL_SMALL_GHOST)}
            >
              <UserRoundPlus className="h-3.5 w-3.5" />
              Inviter à collaborer
            </button>
          )}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [project.guests.length, "Invités"],
            [confirmedCount, "Confirmés"],
            [project.guests.filter(g => effectiveGuestDietary(g, links[g.id])).length, "Régimes"],
            [project.guests.filter(g => !g.tableId && effectiveGuestRsvp(g, links[g.id]) !== "decline").length, "Sans table"],
          ].map(([count, label], index) => (
            <div key={index} className="rounded-2xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-4 text-center">
              <p className="aime-apple-title text-2xl text-[var(--agency-ink)]">{count as number}</p>
              <p className={cn(EYEBROW, "mt-1 text-[9px]")}>{label as string}</p>
            </div>
          ))}
        </div>
      </div>

      {notice && <p role="status" className={cn(CARD, "px-4 py-3 text-xs text-[var(--agency-body)]")}>{notice}</p>}

      <div className="flex gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-4">
          <Search className="h-3.5 w-3.5 text-[var(--agency-eyebrow)]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Nom ou régime…"
            className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-[var(--agency-eyebrow)]"
          />
        </label>
        {canEdit && (
          <button
            onClick={() =>
              addEntity("guests", {
                name: "Nouvel invité",
                role: "invite",
                rsvp: "en_attente",
                attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false } })
            }
            className={cn(PILL_SMALL, "bg-[var(--agency-ink)] text-[var(--agency-paper)] hover:opacity-85")}
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </button>
        )}
      </div>

      <div className="grid gap-4">
        {guests.map(guest => {
          const journey = project.timeline.filter(event => event.relations?.some(relation => relation.kind === "guest" && relation.id === guest.id));
          const table = project.tables.find(item => item.id === guest.tableId);
          const link = links[guest.id];
          const activeLink = link && !link.revoked ? link : undefined;
          const responseLabel =
            link?.response?.status === "confirmed"
              ? "Présence confirmée"
              : link?.response?.status === "declined"
                ? "Participation déclinée"
                : activeLink
                  ? "Réponse en attente"
                  : link?.revoked
                    ? "Lien révoqué"
                    : "Aucun lien envoyé";
          const effectiveRsvp = effectiveGuestRsvp(guest, link);
          const effectiveDietary = effectiveGuestDietary(guest, link);

          return (
            <div key={guest.id} className={cn(CARD, "p-5")}>
              <div className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] font-display text-sm uppercase text-[var(--agency-ink)]">
                  {guest.name.charAt(0)}
                </span>
                <input
                  disabled={!canEdit}
                  value={guest.name}
                  onChange={e => updateEntity("guests", guest.id, { name: e.target.value })}
                  className="flex-1 bg-transparent text-[15px] font-medium outline-none text-[var(--agency-ink)]"
                />
                {canEdit && (
                  <button onClick={() => removeEntity("guests", guest.id)} className="text-[var(--agency-eyebrow)] hover:text-[#B42318]">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <select
                  aria-label={`Présence de ${guest.name}`}
                  title={link?.response ? "Réponse enregistrée par la personne invitée" : undefined}
                  disabled={!canEdit || Boolean(link?.response)}
                  value={effectiveRsvp}
                  onChange={e => updateEntity("guests", guest.id, { rsvp: e.target.value })}
                  className="rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-2 text-xs outline-none disabled:opacity-70"
                >
                  <option value="en_attente">En attente</option>
                  <option value="confirme">Confirmé</option>
                  <option value="decline">Absent</option>
                </select>
                <input
                  disabled={!canEdit || Boolean(link?.response)}
                  title={link?.response ? "Régime renseigné par la personne invitée" : undefined}
                  value={effectiveDietary}
                  onChange={e => updateEntity("guests", guest.id, { dietary: e.target.value })}
                  placeholder="Régime"
                  className="rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-2 text-xs outline-none placeholder:text-[var(--agency-eyebrow)] disabled:opacity-70"
                />
                <select
                  disabled={!canEdit}
                  value={guest.tableId || ""}
                  onChange={e => updateEntity("guests", guest.id, { tableId: e.target.value || undefined })}
                  className="rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-2 text-xs outline-none"
                >
                  <option value="">Sans table</option>
                  {project.tables.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              {apiAvailable && canInviteParticipants && activeLink && <RsvpRecipientAuthorization projectId={project.id} guestId={guest.id} contact={guest.contact} claimEmail={activeLink.claimEmail} claimedAt={activeLink.claimedAt} onSaved={refreshParticipantLinks} />}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--agency-hairline)] pt-4">
                <span className="mr-auto inline-flex items-center gap-2 text-[10px] uppercase tracking-[.12em] text-[var(--agency-eyebrow)]">
                  <Link2 className="h-3 w-3" />
                  {apiAvailable ? responseLabel : "Gestion locale uniquement"}
                  {apiAvailable && link?.respondedAt ? ` · ${new Date(link.respondedAt).toLocaleDateString("fr-FR")}` : ""}
                </span>
                {!apiAvailable && (
                  <span className="text-[10px] uppercase tracking-[.12em] text-[var(--agency-eyebrow)]">Hors-ligne</span>
                )}
                {apiAvailable && canInviteParticipants && !activeLink && (
                  <button
                    data-testid={`participant-invite-${guest.id}`}
                    disabled={busyGuestId === guest.id}
                    type="button"
                    onClick={() => void createParticipantLink(guest.id)}
                    className={cn(PILL_SMALL_INK, "disabled:opacity-40")}
                  >
                    {link?.revoked ? "Réémettre et copier le lien RSVP" : "Créer et copier le lien RSVP"}
                  </button>
                )}
                {apiAvailable && canInviteParticipants && activeLink && (
                  <>
                    <button
                      data-testid={`participant-copy-${guest.id}`}
                      type="button"
                      onClick={() => void copyParticipantLink(activeLink)}
                      className={cn(PILL_SMALL_GHOST)}
                    >
                      <Copy className="h-3 w-3" />
                      Copier
                    </button>
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={participantUrl(activeLink.token)}
                      className={cn(PILL_SMALL_GHOST)}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ouvrir
                    </a>
                    <button
                      data-testid={`participant-revoke-${guest.id}`}
                      disabled={busyGuestId === guest.id}
                      type="button"
                      onClick={() => void revokeParticipantLink(guest.id)}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-[var(--agency-eyebrow)] hover:text-[#B42318] disabled:opacity-40"
                    >
                      <X className="h-3 w-3" />
                      Révoquer
                    </button>
                  </>
                )}
              </div>

              <div className="mt-4 border-t border-[var(--agency-hairline)] pt-4">
                <p className={cn(EYEBROW, "text-[9px]")}>
                  Programme de {guest.name} · Table : {table?.name || "non choisie"}
                  {effectiveDietary ? ` · ${effectiveDietary}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {journey.length ? (
                    journey.map(event => (
                      <span
                        key={event.id}
                        className="rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-1 text-[11px] text-[var(--agency-body)]"
                      >
                        {new Date(event.time).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {event.title}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[var(--agency-eyebrow)]">Aucun moment prévu pour cette personne.</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fusion P1: Seating intégré dans Invités */}
      <div className={cn(CARD, "p-6")}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className={EYEBROW}>Plan de table</p>
            <h4 className="aime-apple-title mt-2 text-xl text-[var(--agency-ink)]">Les tables</h4>
            <p className="mt-1 text-xs leading-relaxed text-[var(--agency-body)]">Même panneau que les invités — assignation locale, sans serveur.</p>
          </div>
          {canEdit && (
            <button
              onClick={() => addEntity("tables", { name: `Table ${project.tables.length + 1}`, capacity: 8 })}
              className={cn(PILL_SMALL, "bg-[var(--agency-ink)] text-[var(--agency-paper)] hover:opacity-85")}
            >
              <Plus className="h-3.5 w-3.5" /> Table
            </button>
          )}
        </div>

        {(() => {
          const unassigned = project.guests.filter((g: any) => effectiveGuestRsvp(g, links[g.id]) !== "decline" && !g.tableId);
          return (
            <>
              {unassigned.length > 0 && (
                <div className="mt-5 rounded-2xl border border-brand-accent/25 bg-brand-accent/5 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-brand-accent">
                    <AlertTriangle className="w-3.5 h-3.5" /> À placer · {unassigned.length}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {unassigned.map((g: any) => (
                      <GuestSeatRow key={g.id} guest={g} tables={project.tables} onChange={(tableId: string) => updateEntity("guests", g.id, { tableId: tableId || undefined })} />
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {project.tables.map((table: any) => {
                  const tableGuests = project.guests.filter((g: any) => g.tableId === table.id && effectiveGuestRsvp(g, links[g.id]) !== "decline");
                  return (
                    <div key={table.id} className="rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-medium">{table.name}</h5>
                          <p className={cn("text-xs mt-1", tableGuests.length > table.capacity ? "text-brand-accent" : "text-foreground/40")}>
                            {tableGuests.length} / {table.capacity} places
                          </p>
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => {
                              tableGuests.forEach((g: any) => updateEntity("guests", g.id, { tableId: undefined }));
                              removeEntity("tables", table.id);
                            }}
                            className="text-foreground/30 hover:text-brand-accent"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="mt-4 space-y-2">
                        {tableGuests.length === 0 ? (
                          <p className="text-xs text-foreground/30">Aucun invité assigné</p>
                        ) : (
                          tableGuests.map((g: any) => (
                            <GuestSeatRow key={g.id} guest={g} tables={project.tables} onChange={(tid: string) => updateEntity("guests", g.id, { tableId: tid || undefined })} />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {project.tables.length === 0 && <p className="mt-4 text-xs text-[var(--agency-eyebrow)]">Aucune table — ajoutez-en une.</p>}
            </>
          );
        })()}
      </div>
    </div>
  );
}

function GuestSeatRow({ guest, tables, onChange }: { guest: { name: string; tableId?: string; dietary?: string }; tables: { id: string; name: string }[]; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-4 py-2">
      <span className="flex-1 truncate text-sm text-[var(--agency-ink)]">
        {guest.name}
        {guest.dietary && <span className="ml-2 text-[10px] text-[var(--agency-body)]">{guest.dietary}</span>}
      </span>
      <select value={guest.tableId || ""} onChange={(e) => onChange(e.target.value)} className="max-w-[130px] rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-1.5 text-xs outline-none">
        <option value="">Sans table</option>
        {tables.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
