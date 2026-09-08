import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, Link2, Plus, Search, Trash2, UserRoundPlus, X } from "lucide-react";
import { useProject } from "@/store/project-store";
import type { ParticipantLink } from "@/lib/types";
import { effectiveGuestDietary, effectiveGuestRsvp } from "@/lib/participant-rsvp";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || `Erreur ${response.status}`);
  return body as T;
}

function participantUrl(token: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";
  const root = base === "/" ? "" : base;
  return `${window.location.origin}${root}/rsvp/${token}`;
}

export function GuestPanel() {
  const { project, participantLinks: links, refreshParticipantLinks, updateEntity, addEntity, removeEntity, canEdit, currentRole } = useProject();
  const [query, setQuery] = useState("");
  const [busyGuestId, setBusyGuestId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const canInviteParticipants = currentRole === "owner" || currentRole === "planner";
  const projectId = project?.id;
  const confirmedCount = useMemo(
    () => project?.guests.filter(guest => links[guest.id]?.response?.status === "confirmed" || (!links[guest.id]?.response && guest.rsvp === "confirme")).length ?? 0,
    [links, project?.guests],
  );

  useEffect(() => {
    if (!projectId || !canInviteParticipants) {
      return;
    }
    let active = true;
    setNotice("");
    void refreshParticipantLinks()
      .catch(error => {
        if (active) setNotice(error instanceof Error ? error.message : "Liens RSVP indisponibles");
      });
    return () => { active = false; };
  }, [canInviteParticipants, projectId, refreshParticipantLinks]);

  if (!project) return null;
  const guests = project.guests.filter(guest => `${guest.name} ${effectiveGuestDietary(guest, links[guest.id])}`.toLowerCase().includes(query.toLowerCase()));
  const createParticipantLink = async (guestId: string) => {
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

  return <div className="mx-auto max-w-4xl space-y-4">
    <section className="rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4 sm:p-5" aria-labelledby="participant-invitations-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[9px] uppercase tracking-[.18em] text-foreground/40">Droit · Participation</p>
          <h3 id="participant-invitations-title" className="mt-2 text-base font-medium">Inviter à participer</h3>
          <p className="mt-2 text-xs font-light leading-relaxed text-foreground/55">Chaque personne reçoit son propre lien RSVP pour répondre à l’événement. Ce lien ne crée pas de compte et ne donne aucun accès au Monde.</p>
        </div>
        {canInviteParticipants && <button type="button" onClick={() => {
          window.dispatchEvent(new Event("aime:close-world-panel"));
          window.requestAnimationFrame(() => window.dispatchEvent(new Event("aime:open-collaboration-invite")));
        }} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-foreground/15 px-3 py-2 text-xs text-foreground/65 transition hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><UserRoundPlus className="h-3.5 w-3.5" />Inviter à collaborer</button>}
      </div>
    </section>
    {notice && <p role="status" className="rounded-xl border border-foreground/10 px-4 py-3 text-xs text-foreground/65">{notice}</p>}
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[project.guests.length, confirmedCount, project.guests.filter(g => effectiveGuestDietary(g, links[g.id])).length, project.guests.filter(g => !g.tableId && effectiveGuestRsvp(g, links[g.id]) !== "decline").length].map((count, index) => <div key={index} className="rounded-xl border border-foreground/10 p-3 text-center"><p className="text-xl">{count}</p><p className="text-[9px] uppercase text-foreground/40">{["Invités", "Confirmés", "Régimes", "Sans table"][index]}</p></div>)}</div>
    <div className="flex gap-2"><label className="flex flex-1 items-center gap-2 rounded-full border border-foreground/10 px-3"><Search className="h-3.5 w-3.5" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nom ou régime…" className="w-full bg-transparent py-2 text-sm outline-none" /></label>{canEdit && <button onClick={() => addEntity("guests", { name: "Nouvel invité", role: "invite", rsvp: "en_attente", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false } })} className="rounded-full border border-foreground/15 px-3 text-xs"><Plus className="mr-1 inline h-3 w-3" />Ajouter une personne</button>}</div>
    {guests.map(guest => {
      const journey = project.timeline.filter(event => event.relations?.some(relation => relation.kind === "guest" && relation.id === guest.id));
      const table = project.tables.find(item => item.id === guest.tableId);
      const link = links[guest.id];
      const activeLink = link && !link.revoked ? link : undefined;
      const responseLabel = link?.response?.status === "confirmed" ? "Présence confirmée" : link?.response?.status === "declined" ? "Participation déclinée" : activeLink ? "Réponse en attente" : link?.revoked ? "Lien révoqué" : "Aucun lien envoyé";
      const effectiveRsvp = effectiveGuestRsvp(guest, link);
      const effectiveDietary = effectiveGuestDietary(guest, link);
      return <div key={guest.id} className="rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4">
        <div className="flex gap-3"><input disabled={!canEdit} value={guest.name} onChange={e => updateEntity("guests", guest.id, { name: e.target.value })} className="flex-1 bg-transparent text-sm font-medium outline-none" />{canEdit && <button onClick={() => removeEntity("guests", guest.id)}><Trash2 className="h-4 w-4 text-foreground/25" /></button>}</div>
        <div className="mt-3 grid grid-cols-3 gap-2"><select aria-label={`Présence de ${guest.name}`} title={link?.response ? "Réponse enregistrée par la personne invitée" : undefined} disabled={!canEdit || Boolean(link?.response)} value={effectiveRsvp} onChange={e => updateEntity("guests", guest.id, { rsvp: e.target.value })} className="rounded-lg bg-foreground/10 p-2 text-xs disabled:opacity-70"><option value="en_attente">En attente</option><option value="confirme">Confirmé</option><option value="decline">Absent</option></select><input disabled={!canEdit || Boolean(link?.response)} title={link?.response ? "Régime renseigné par la personne invitée" : undefined} value={effectiveDietary} onChange={e => updateEntity("guests", guest.id, { dietary: e.target.value })} placeholder="Régime" className="rounded-lg bg-foreground/10 p-2 text-xs outline-none disabled:opacity-70" /><select disabled={!canEdit} value={guest.tableId || ""} onChange={e => updateEntity("guests", guest.id, { tableId: e.target.value || undefined })} className="rounded-lg bg-foreground/10 p-2 text-xs"><option value="">Sans table</option>{project.tables.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-foreground/5 pt-3">
          <span className="mr-auto inline-flex items-center gap-2 text-[10px] uppercase tracking-[.12em] text-foreground/45"><Link2 className="h-3 w-3" />{responseLabel}{link?.respondedAt ? ` · ${new Date(link.respondedAt).toLocaleDateString("fr-FR")}` : ""}</span>
          {canInviteParticipants && !activeLink && <button data-testid={`participant-invite-${guest.id}`} disabled={busyGuestId === guest.id} type="button" onClick={() => void createParticipantLink(guest.id)} className="rounded-full bg-foreground px-3 py-2 text-xs font-medium text-background disabled:opacity-40">{link?.revoked ? "Réémettre et copier le lien RSVP" : "Créer et copier le lien RSVP"}</button>}
          {canInviteParticipants && activeLink && <>
            <button data-testid={`participant-copy-${guest.id}`} type="button" onClick={() => void copyParticipantLink(activeLink)} className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 px-3 py-2 text-xs text-foreground/65 hover:text-foreground"><Copy className="h-3 w-3" />Copier</button>
            <a target="_blank" rel="noreferrer" href={participantUrl(activeLink.token)} className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 px-3 py-2 text-xs text-foreground/65 hover:text-foreground"><ExternalLink className="h-3 w-3" />Ouvrir</a>
            <button data-testid={`participant-revoke-${guest.id}`} disabled={busyGuestId === guest.id} type="button" onClick={() => void revokeParticipantLink(guest.id)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-foreground/45 hover:text-destructive disabled:opacity-40"><X className="h-3 w-3" />Révoquer</button>
          </>}
        </div>
        <div className="mt-3 border-t border-foreground/5 pt-3"><p className="text-[9px] uppercase tracking-widest text-foreground/35">Programme de {guest.name} · Table : {table?.name || "non choisie"}{effectiveDietary ? ` · ${effectiveDietary}` : ""}</p><div className="mt-2 flex flex-wrap gap-2">{journey.length ? journey.map(event => <span key={event.id} className="rounded-full bg-foreground/5 px-2 py-1 text-[10px] text-foreground/55">{new Date(event.time).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {event.title}</span>) : <span className="text-xs text-foreground/30">Aucun moment prévu pour cette personne.</span>}</div></div>
      </div>;
    })}
  </div>;
}