/**
 * Les vues sont des projections : la ligne de temps, Avant / Pendant / Après,
 * la finance, les documents, les médias et la musique sont tous dérivés du
 * même `WorldProject`. Rien n'est recopié.
 */
import type { TimelineMarker, TimelineStatus } from "@/components/aime/HeroTimeline";
import { DAY, atHour, type Confidence, type WorldProject, type WorldProvider } from "./types";

/** Statut de la ligne de temps déduit de la confiance et de la position dans le temps. */
export function statusFor(confidence: Confidence, at: number, now: number): TimelineStatus {
  if (confidence === "suggere" || confidence === "a_confirmer") return "a_valider";
  if (confidence === "manquant") return "en_attente";
  return at <= now ? "execute" : "prepare";
}

function providerName(p: WorldProvider) {
  return p.name ? `${p.role} — ${p.name}` : p.role;
}

export function providerById(project: WorldProject, id?: string) {
  return id ? project.providers.find((p) => p.id === id) : undefined;
}

/**
 * La ligne de temps universelle : un repère par objet du modèle,
 * avec ses relations et son statut de confiance.
 */
export function deriveTimeline(project: WorldProject, now = Date.now()): TimelineMarker[] {
  const day = project.pivot.value;
  const out: TimelineMarker[] = [];
  const push = (m: TimelineMarker) => out.push(m);

  const meta = (confidence: Confidence, extra?: Record<string, unknown>) => ({
    confidence,
    projectKind: project.kind,
    ...extra,
  });

  for (const i of project.intentions) {
    push({
      id: `intention-${i.id}`,
      time: i.at,
      kind: "intention",
      media: "historique",
      title: "Intention",
      detail: i.text,
      universe: project.universe,
      projectId: project.id,
      source: "récit",
      status: statusFor("confirme", i.at, now),
      metadata: meta("confirme"),
    });
  }

  for (const t of project.tasks) {
    const provider = providerById(project, t.providerId);
    push({
      id: `tache-${t.id}`,
      time: t.at,
      kind: "tache",
      media: "doc",
      title: t.label,
      ...(t.detail ? { detail: t.detail } : {}),
      universe: project.universe,
      projectId: project.id,
      done: t.done ?? false,
      dueAt: t.at,
      source: t.confidence === "suggere" ? "AIME" : "projet",
      status: statusFor(t.confidence, t.at, now),
      ...(provider ? { relatedIds: [`prestataire-${provider.id}`] } : {}),
      metadata: meta(t.confidence, provider ? { providerId: provider.id, role: provider.role } : undefined),
    });
  }

  for (const p of project.providers) {
    if (p.status === "a_rechercher" || p.status === "suggestion") {
      push({
        id: `prestataire-${p.id}`,
        time: p.signedAt ?? day - 200 * DAY,
        kind: "jalon",
        media: "rencontre",
        ...(p.photo ? { thumbUrl: p.photo } : {}),
        title: `${p.role} — à trouver`,
        ...(p.note ? { detail: p.note } : {}),
        universe: project.universe,
        projectId: project.id,
        source: "AIME",
        status: "a_valider",
        metadata: meta(p.confidence, { providerId: p.id, providerStatus: p.status, role: p.role }),
      });
      continue;
    }
    push({
      id: `prestataire-${p.id}`,
      time: p.signedAt ?? day - 180 * DAY,
      kind: "jalon",
      media: "rencontre",
      ...(p.photo ? { thumbUrl: p.photo } : {}),
      title: providerName(p),
      ...(p.note ? { detail: p.note } : {}),
      ...(p.city ? { location: p.city } : {}),
      universe: project.universe,
      projectId: project.id,
      source: "projet",
      status: statusFor(p.confidence, p.signedAt ?? day, now),
      metadata: meta(p.confidence, { providerId: p.id, providerStatus: p.status, role: p.role }),
    });
  }

  for (const d of project.documents) {
    const provider = providerById(project, d.providerId);
    push({
      id: `doc-${d.id}`,
      time: d.at,
      kind: d.kind === "contrat" || d.kind === "document" ? "document" : d.kind,
      media: "doc",
      ...(d.photo ? { thumbUrl: d.photo } : {}),
      title: d.title,
      ...(d.detail ? { detail: d.detail } : {}),
      ...(d.amountCents !== undefined ? { amountCents: d.amountCents } : {}),
      universe: project.universe,
      projectId: project.id,
      source: "document",
      status: statusFor(d.confidence, d.at, now),
      ...(provider ? { relatedIds: [`prestataire-${provider.id}`] } : {}),
      metadata: meta(d.confidence, provider ? { providerId: provider.id, role: provider.role } : undefined),
    });
  }

  for (const p of project.payments) {
    const provider = providerById(project, p.providerId);
    push({
      id: `paiement-${p.id}`,
      time: p.at,
      kind: "paiement",
      media: "doc",
      title: p.label,
      amountCents: p.amountCents,
      universe: project.universe,
      projectId: project.id,
      dueAt: p.at,
      source: "finance",
      status: p.state === "paye" ? "execute" : statusFor(p.confidence, p.at, now),
      ...(provider ? { relatedIds: [`prestataire-${provider.id}`] } : {}),
      metadata: meta(p.confidence, provider ? { providerId: provider.id, role: provider.role } : undefined),
    });
  }

  for (const m of project.moments) {
    const provider = providerById(project, m.providerId);
    const t = atHour(day, m.offsetH);
    push({
      id: `moment-${m.id}`,
      time: t,
      startTime: t,
      kind: "evenement",
      media: "rencontre",
      ...(m.photo ? { thumbUrl: m.photo } : {}),
      title: m.label,
      ...(m.detail ? { detail: provider ? `${m.detail} · ${provider.name ?? provider.role}` : m.detail } : {}),
      ...(m.location ?? project.venue.value
        ? { location: m.location ?? project.venue.value ?? undefined }
        : {}),
      universe: project.universe,
      projectId: project.id,
      source: m.confidence === "suggere" ? "AIME" : "projet",
      status: statusFor(m.confidence, t, now),
      ...(provider ? { relatedIds: [`prestataire-${provider.id}`] } : {}),
      metadata: meta(m.confidence, provider ? { providerId: provider.id, role: provider.role } : undefined),
    });
  }

  for (const t of project.tracks) {
    const time = atHour(day, t.offsetH);
    push({
      id: `musique-${t.id}`,
      time,
      startTime: time,
      kind: "jalon",
      media: "audio",
      title: t.title,
      detail: t.dedicace ? `${t.artist} · ${t.dedicace}` : `${t.artist} · ${t.moment}`,
      universe: project.universe,
      projectId: project.id,
      source: "musique",
      status: statusFor(t.confidence, time, now),
      metadata: meta(t.confidence, {
        track: { title: t.title, artist: t.artist, moment: t.moment },
      }),
    });
  }

  for (const m of project.media) {
    push({
      id: `media-${m.id}`,
      time: m.at,
      kind: "souvenir",
      media: m.kind === "video" ? "video" : "rencontre",
      ...(m.thumb ? { thumbUrl: m.thumb } : {}),
      ...(m.url ? { mediaUrl: m.url } : {}),
      title: m.title,
      ...(m.detail ? { detail: m.detail } : {}),
      universe: project.universe,
      projectId: project.id,
      ...(m.personIds ? { personIds: m.personIds } : {}),
      source: "média",
      status: statusFor(m.confidence, m.at, now),
      metadata: meta(m.confidence, { mediaKind: m.kind }),
    });
  }

  for (const m of project.messages) {
    const provider = providerById(project, m.providerId);
    push({
      id: `message-${m.id}`,
      time: m.at,
      kind: "message",
      media: "historique",
      ...(m.photo ? { thumbUrl: m.photo } : {}),
      title: m.from,
      detail: m.text,
      universe: project.universe,
      projectId: project.id,
      source: "message",
      status: "execute",
      ...(provider ? { relatedIds: [`prestataire-${provider.id}`] } : {}),
      metadata: meta("confirme", provider ? { providerId: provider.id, role: provider.role } : undefined),
    });
  }

  return out
    .map((marker) => {
      const edit = project.timelineEdits?.[marker.id];
      if (!edit) return marker;
      return {
        ...marker,
        ...(edit.title !== undefined ? { title: edit.title } : {}),
        ...(edit.detail !== undefined ? { detail: edit.detail } : {}),
        ...(edit.time !== undefined ? { time: edit.time, startTime: marker.startTime ? edit.time : marker.startTime } : {}),
        metadata: { ...marker.metadata, editedBy: "utilisateur" },
      };
    })
    .sort((a, b) => a.time - b.time);
}

/** Fenêtre du jour pivot : de minuit au lendemain 6 h (la nuit appartient au jour J). */
export function pivotWindow(project: WorldProject) {
  const from = project.pivot.value;
  return { from, to: from + DAY + 6 * 3_600_000 };
}

export function splitPhases(project: WorldProject, markers: TimelineMarker[]) {
  const { from, to } = pivotWindow(project);
  return {
    avant: markers.filter((m) => m.time < from),
    pendant: markers.filter((m) => m.time >= from && m.time <= to),
    apres: markers.filter((m) => m.time > to),
  };
}

/** La finance n'est pas une base séparée : elle se recompose depuis les prestataires. */
export function financeOf(project: WorldProject) {
  if (project.commitments?.length) {
    const engaged = project.commitments.reduce((sum, c) => sum + c.totalAmountCents, 0);
    const deposits = project.commitments.reduce(
      (sum, c) => sum + (c.schedule.find((i) => i.id.endsWith("-acompte"))?.amountCents ?? 0),
      0,
    );
    const paid = project.commitments.reduce(
      (sum, c) => sum + c.schedule.reduce((inner, i) => inner + (i.status === "paye" ? i.amountCents : 0), 0),
      0,
    );
    return { engaged, deposits, paid, balance: Math.max(0, engaged - paid) };
  }
  const engaged = project.providers.reduce((s, p) => s + (p.amountCents ?? 0), 0);
  const deposits = project.providers.reduce((s, p) => s + (p.depositCents ?? 0), 0);
  const paid = project.payments
    .filter((p) => p.state === "paye")
    .reduce((s, p) => s + p.amountCents, 0);
  return { engaged, deposits, paid, balance: engaged - deposits };
}

export function bookedProviders(project: WorldProject) {
  return project.providers.filter((p) => p.status === "choisi" || p.status === "reserve");
}

export function openProviders(project: WorldProject) {
  return project.providers.filter((p) => p.status === "suggestion" || p.status === "a_rechercher");
}
