import type { TimelineMarker } from "@/components/aime/HeroTimeline";
import { narrationFor, openingLine } from "./narrate";
import type { PlayRequest, PlayScope, PlayableItem, PlayableType, Transition } from "./types";

const MIN = 60_000;
const DAY = 86_400_000;

/** Un repère est-il une photo ? (vignette sans média joué) */
function typeOf(m: TimelineMarker): PlayableType | null {
  if (m.metadata?.["musicProvider"] || m.metadata?.["track"]) return "musique";
  if (m.media === "video") return "video";
  if (m.media === "audio") return "audio";
  if (m.thumbUrl) return "photo";
  if (m.kind === "message") return "texte";
  if (m.kind === "souvenir" || m.kind === "evenement" || m.kind === "jalon") return "texte";
  return null;
}

function inScope(m: TimelineMarker, scope: PlayScope): boolean {
  switch (scope.kind) {
    case "tout":
      return true;
    case "jour": {
      const d = new Date(scope.at);
      const from = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      return m.time >= from && m.time < from + DAY;
    }
    case "semaine": {
      const d = new Date(scope.at);
      const shift = (d.getDay() + 6) % 7;
      const from = new Date(d.getFullYear(), d.getMonth(), d.getDate() - shift).getTime();
      return m.time >= from && m.time < from + 7 * DAY;
    }
    case "mois": {
      const d = new Date(scope.at);
      const from = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      return m.time >= from && m.time < to;
    }
    case "periode":
      return m.time >= scope.from && m.time <= scope.to;
    case "evenement":
      return m.projectId === scope.projectId || m.id === scope.projectId;
    case "personne":
      return !!m.personIds?.includes(scope.personId);
    case "selection":
      return scope.ids.includes(m.id);
  }
}

function matchesMode(t: PlayableType, m: TimelineMarker, mode: PlayRequest["mode"]): boolean {
  switch (mode) {
    case "tout":
    case "film":
    case "narration":
      return true;
    case "photos":
      return t === "photo";
    case "videos":
      return t === "video";
    case "audio":
      return t === "audio" || t === "musique";
    case "musique":
      return t === "musique";
    case "messages":
      return t === "texte" && m.kind === "message";
    case "souvenirs":
      return m.kind === "souvenir" || t === "photo" || t === "video";
    case "evenements":
      return m.kind === "evenement" || m.kind === "jalon";
  }
}

function durationOf(t: PlayableType, m: TimelineMarker, photoMs: number): number {
  const declared = Number(m.metadata?.["durationMs"] ?? 0);
  if (declared > 0) return declared;
  switch (t) {
    case "photo":
      return photoMs;
    case "texte":
      return 4_000;
    case "narration":
      return 5_000;
    case "musique":
      return 3 * MIN;
    default:
      return 8_000;
  }
}

function transitionOf(t: PlayableType): Transition {
  return t === "photo" ? "fondu" : "coupe";
}

/**
 * Pipeline unique : TIMELINE → FILTRE → TRI → ENRICHISSEMENT → FILE DE LECTURE.
 * Aucun média n'est copié ni modifié : la file pointe vers les objets d'origine.
 */
export function buildPlayQueue(markers: TimelineMarker[], req: PlayRequest): PlayableItem[] {
  const photoMs = req.photoMs ?? 3_000;
  const kept = markers
    .filter((m) => inScope(m, req.scope))
    .map((m) => ({ m, t: typeOf(m) }))
    .filter((x): x is { m: TimelineMarker; t: PlayableType } => !!x.t)
    .filter((x) => matchesMode(x.t, x.m, req.mode))
    .sort((a, b) => (a.m.startTime ?? a.m.time) - (b.m.startTime ?? b.m.time));

  const out: PlayableItem[] = [];
  const narrate = req.withNarration || req.mode === "narration" || req.mode === "film";

  if (narrate && kept.length > 0) {
    out.push({
      id: "narration-ouverture",
      type: "narration",
      timestamp: kept[0]!.m.time,
      duration: 5_000,
      title: "Récit",
      narration: openingLine(kept.map((k) => k.m)),
      transition: "fondu",
      priority: 0,
      marker: kept[0]!.m,
    });
  }

  let lastDay = "";
  for (const { m, t } of kept) {
    if (narrate) {
      const day = new Date(m.time).toDateString();
      if (day !== lastDay) {
        lastDay = day;
        out.push({
          id: `narration-${m.id}`,
          type: "narration",
          timestamp: m.time,
          duration: 5_000,
          title: "Récit",
          narration: narrationFor(m),
          transition: "fondu",
          priority: 0,
          marker: m,
        });
      }
    }
    out.push({
      id: m.id,
      type: t,
      timestamp: m.startTime ?? m.time,
      duration: durationOf(t, m, photoMs),
      mediaUrl: m.mediaUrl,
      thumbnail: m.thumbUrl,
      title: m.title,
      subtitle: m.detail,
      source: m.source,
      narration: narrate ? narrationFor(m) : undefined,
      transition: transitionOf(t),
      priority: m.priority ?? 0,
      metadata: m.metadata,
      marker: m,
    });
  }
  return out;
}

/** Durée totale de la file, en millisecondes. */
export function queueDuration(items: PlayableItem[]): number {
  return items.reduce((s, i) => s + i.duration, 0);
}
