import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FilTrack, MOMENT_LANE_OFFSETS, momentTimeLabel, type FilArrival } from "./FilTrack";
import type { ProfileTimelineEvent } from "./ProfileFeed";
import { DEFAULT_TIMELINE_LAYOUT, layoutTimeline, type TimelineLayoutItem } from "@/lib/timeline-layout";

const HOUR = 3_600_000;
const DAY = 86_400_000;
const PIVOT = Date.UTC(2027, 7, 14, 16, 0, 0);

type RawMoment = { id: string; time: number; title: string; durationMinutes?: number; confidence?: string };

function toEvent(item: RawMoment): ProfileTimelineEvent {
  return {
    id: item.id,
    time: item.time,
    title: item.title,
    kind: "evenement",
    status: "prepare",
    confidence: item.confidence ?? "confirme",
    phase: "avant",
    universe: "mariage",
    visibility: "equipe",
    relations: [],
    ...(item.durationMinutes === undefined ? {} : { durationMinutes: item.durationMinutes }),
  } as unknown as ProfileTimelineEvent;
}

/**
 * Le cas qui coinçait : la préparation s'étale sur un an, le Jour J concentre
 * douze Moments en quatorze heures.
 */
function weddingMoments(): ProfileTimelineEvent[] {
  const titles = [
    "Réservez le lieu", "Choisissez le traiteur", "Envoyez les faire-part",
    "Essayage de la tenue", "Réservez le photographe", "Déposez la liste",
    "Confirmez le menu", "Plan de table", "Retrait des alliances",
    "Répétition", "Veillée", "Derniers appels",
  ];
  const prep = [365, 300, 240, 180, 120, 75, 30, 2].map((daysAgo, index) => ({
    id: `p${index}`,
    time: PIVOT - daysAgo * DAY,
    title: titles[index],
  }));
  const dayOf = [8, 9, 10, 11, 12, 13.5, 15, 16, 17, 19, 21, 22.5].map((hour, index) => ({
    id: `j${index}`,
    time: PIVOT - 16 * HOUR + hour * HOUR,
    title: titles[8 + (index % 4)],
    durationMinutes: 90,
  }));
  const after = [2, 21, 60].map((daysAfter, index) => ({
    id: `a${index}`,
    time: PIVOT + daysAfter * DAY,
    title: ["Remerciements", "Album", "Voyage"][index],
  }));
  return [...prep, ...dayOf, ...after].map(toEvent);
}

function weddingArrivals(): FilArrival[] {
  return [
    { id: "rsvp-1", guestId: "g1", guestName: "Camille", status: "confirmed" },
    { id: "rsvp-2", guestId: "g2", guestName: "Youssef", status: "confirmed" },
    { id: "rsvp-3", guestId: "g3", guestName: "Léa", status: "declined" },
  ];
}

/** Rend le fil réel et extrait ce qu'il a effectivement émis dans le DOM. */
function renderFil(overrides: {
  events?: ProfileTimelineEvent[];
  arrivals?: FilArrival[];
  conflicts?: Map<string, string[]>;
  markers?: Map<string, import("@/lib/timeline-layout").TimelineMarkerLayout>;
  layoutOptions?: Parameters<typeof layoutTimeline>[1];
} = {}) {
  const events = overrides.events ?? weddingMoments();
  const arrivals = overrides.arrivals ?? weddingArrivals();
  const items: TimelineLayoutItem[] = [
    ...events.map(event => ({ id: event.id, time: event.time, group: "moment" })),
    ...arrivals.map(arrival => ({ id: arrival.id, time: PIVOT - 40 * DAY, group: "rsvp" })),
  ];
  const layout = layoutTimeline(items, overrides.layoutOptions ?? { groups: { rsvp: { lanes: 2 } } });
  const markers = overrides.markers ?? new Map(layout.markers.map(marker => [marker.id, marker]));

  const html = renderToStaticMarkup(
    <FilTrack
      events={events}
      arrivals={arrivals}
      markers={markers}
      conflicts={overrides.conflicts}
      onOpenMoment={() => {}}
      onOpenArrival={() => {}}
    />,
  );

  type Placed = { id: string; left: number; top: number | null; hidden: boolean; block: string };
  const read = (prefix: string): Placed[] => {
    const pattern = new RegExp(`<div data-testid="${prefix}([^\"]+)"[^>]*style=\"left:([\\d.]+)px\"`, "g");
    const placed: Placed[] = [];
    for (const match of html.matchAll(pattern)) {
      const id = match[1];
      const from = match.index ?? 0;
      /* Le bloc du repère s'arrête au repère suivant : assez pour lire sa bande. */
      const next = html.indexOf('<div data-testid="', from + 10);
      const block = html.slice(from, next === -1 ? html.length : next);
      const top = /style="top:(-?[\d.]+)px;left:0px"/.exec(block);
      placed.push({
        id,
        left: Number(match[2]),
        top: top ? Number(top[1]) : null,
        hidden: block.includes("opacity-0 group-hover:opacity-100"),
        block,
      });
    }
    return placed;
  };

  return { html, events, markers, moments: read("fil-moment-"), rsvps: read("fil-rsvp-") };
}

describe("momentTimeLabel", () => {
  it("dérive la fin de la durée quand endTime est absent", () => {
    expect(momentTimeLabel({ time: PIVOT, durationMinutes: 90 })).toBe("16:00 – 17:30");
  });

  it("privilégie endTime quand il est renseigné", () => {
    expect(momentTimeLabel({ time: PIVOT, endTime: PIVOT + 2 * HOUR, durationMinutes: 90 }))
      .toBe("16:00 – 18:00");
  });

  it("n'invente jamais une fin sans donnée", () => {
    expect(momentTimeLabel({ time: PIVOT })).toBe("16:00");
    expect(momentTimeLabel({ time: PIVOT, durationMinutes: 0 })).toBe("16:00");
  });
});

describe("FilTrack", () => {
  it("donne à chaque Moment du Jour J sa propre place sur le fil", () => {
    const { moments } = renderFil();
    expect(moments.length).toBeGreaterThan(0);
    const lefts = moments.map(moment => moment.left);
    /* Aucune superposition : deux repères ne partagent jamais la même abscisse. */
    expect(new Set(lefts).size).toBe(lefts.length);
    for (let i = 1; i < lefts.length; i += 1) {
      expect(lefts[i] - lefts[i - 1]).toBeGreaterThanOrEqual(DEFAULT_TIMELINE_LAYOUT.markerWidth);
    }
  });

  it("ne superpose jamais deux étiquettes visibles d'une même bande", () => {
    const { moments } = renderFil();
    const bands = new Map<number, typeof moments>();
    for (const moment of moments) {
      /* Le repère est centré : sa bande verticale est bien l'une des lignes. */
      expect(MOMENT_LANE_OFFSETS).toContain(moment.top);
      bands.set(moment.top!, [...(bands.get(moment.top!) ?? []), moment]);
    }
    for (const [band, lane] of bands) {
      for (let i = 1; i < lane.length; i += 1) {
        const gap = lane[i].left - lane[i - 1].left;
        if (lane[i].hidden || lane[i - 1].hidden) {
          /* Une étiquette masquée ne prend pas de place : le bouton seul compte. */
          expect(gap, `bande ${band}`).toBeGreaterThanOrEqual(DEFAULT_TIMELINE_LAYOUT.markerWidth);
        } else {
          expect(gap, `bande ${band}`).toBeGreaterThanOrEqual(DEFAULT_TIMELINE_LAYOUT.width);
        }
      }
    }
  });

  it("masque l'étiquette au lieu de la superposer, et la garde lisible au survol", () => {
    const events = weddingMoments();
    const layout = layoutTimeline(
      events.map(event => ({ id: event.id, time: event.time, group: "moment" })),
      { lanes: 1 },
    );
    const markers = new Map(layout.markers.map(marker => [marker.id, marker]));
    const { html } = renderFil({ events, arrivals: [], markers });
    expect(html).toContain("opacity-0 group-hover:opacity-100");
    /* Le titre reste dans le DOM : rien n'est perdu, seulement replié. */
    expect(html).toContain("Réservez le lieu");
  });

  it("affiche la plage horaire dérivée, pas une durée inventée", () => {
    const { moments } = renderFil();
    /* Les Moments du Jour J portent une durée : l'horaire est une plage. */
    const jourJ = moments.filter(moment => moment.id.startsWith("j"));
    expect(jourJ.length).toBe(12);
    for (const moment of jourJ) {
      expect(moment.block).toMatch(/\d{2}:\d{2} – \d{2}:\d{2}/);
    }
    /* Les jalons de préparation n'ont pas de durée : une heure seule, jamais « – ». */
    const prep = moments.filter(moment => moment.id.startsWith("p"));
    expect(prep.length).toBe(8);
    for (const moment of prep) {
      const hours = /fil-hours-[^>]*>([^<]*)</.exec(moment.block)?.[1] ?? "";
      expect(hours).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it("signale un conflit seulement quand il existe", () => {
    const events = weddingMoments();
    const sansConflit = renderFil({ events, arrivals: [] });
    expect(sansConflit.html).not.toContain("fil-conflict-");

    const avecConflit = renderFil({
      events,
      arrivals: [],
      conflicts: new Map([["j3", ["Photographe mobilisé simultanément"]]]),
    });
    const conflicted = avecConflit.moments.find(moment => moment.id === "j3");
    expect(conflicted?.block).toContain("fil-conflict-j3");
    /* Le détail est porté par l'infobulle, pas par un compteur. */
    expect(conflicted?.block).toContain("Photographe mobilisé simultanément");
    /* Les autres Moments ne portent aucun indicateur de conflit. */
    expect(avecConflit.html.match(/fil-conflict-/g)).toHaveLength(1);
  });

  it("réserve le point de confiance aux états qui appellent une action", () => {
    /* Titres neutres : un titre qui dirait « Confirmé » se confondrait avec le
       libellé de confiance dans l'infobulle et rendrait l'assertion ambiguë. */
    const events = [
      toEvent({ id: "s1", time: PIVOT - 30 * DAY, title: "Jalon A", confidence: "confirme" }),
      toEvent({ id: "s2", time: PIVOT - 20 * DAY, title: "Jalon B", confidence: "suggere" }),
      toEvent({ id: "s3", time: PIVOT - 10 * DAY, title: "Jalon C", confidence: "a_confirmer" }),
      toEvent({ id: "s4", time: PIVOT - 5 * DAY, title: "Jalon D", confidence: "manquant" }),
    ];
    const { html, moments } = renderFil({ events, arrivals: [] });
    const tip = (id: string) => /title="([^"]*)"/.exec(moments.find(m => m.id === id)!.block)?.[1] ?? "";

    /* Un point seulement pour ce qui demande une action. */
    expect(html).toContain("fil-confidence-s3");
    expect(html).toContain("fil-confidence-s4");
    expect(html).not.toContain("fil-confidence-s1");
    /* « Suggéré » ne prend pas de point : 49 Moments sur 51 le sont, le point
       ne distinguerait plus rien. L'infobulle porte quand même l'information. */
    expect(html).not.toContain("fil-confidence-s2");
    expect(tip("s2")).toContain("Suggéré par AIME");
    expect(tip("s3")).toContain("À confirmer");
    /* Un Moment confirmé ne porte aucun libellé de confiance. */
    expect(tip("s1")).toBe("Jalon A · 16:00");
  });

  it("pose les réponses RSVP sur le fil, hors des bandes de Moments", () => {
    const { rsvps, moments } = renderFil();
    expect(rsvps).toHaveLength(3);
    const momentBands = new Set(moments.map(moment => moment.top));
    for (const rsvp of rsvps) {
      /* Le point RSVP vit sur le fil (aucune bande), donc jamais sur une étiquette. */
      expect(momentBands.has(rsvp.top)).toBe(false);
      /* Son détail est porté par l'infobulle native et par la pastille au survol. */
      expect(rsvp.block).toContain("title=");
      expect(rsvp.block).toContain("opacity-0");
    }
    /* Deux réponses ne retombent pas l'une sur l'autre. */
    const lefts = rsvps.map(rsvp => rsvp.left);
    expect(new Set(lefts).size).toBe(lefts.length);
  });

  it("n'émet rien pour un repère absent du placement", () => {
    const { html } = renderFil({ markers: new Map() });
    expect(html).not.toContain("fil-moment-");
  });
});
