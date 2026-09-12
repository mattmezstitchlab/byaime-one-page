import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIMELINE_LAYOUT,
  layoutTimeline,
  type TimelineLayoutItem,
} from "./timeline-layout";

const HOUR = 3_600_000;
const DAY = 86_400_000;

/** Un mariage réaliste : la préparation s'étale, le Jour J se concentre. */
function weddingProject(pivot = Date.UTC(2027, 7, 14, 16, 0, 0)): TimelineLayoutItem[] {
  const prep: TimelineLayoutItem[] = [
    { id: "p1", time: pivot - 365 * DAY },
    { id: "p2", time: pivot - 300 * DAY },
    { id: "p3", time: pivot - 240 * DAY },
    { id: "p4", time: pivot - 180 * DAY },
    { id: "p5", time: pivot - 120 * DAY },
    { id: "p6", time: pivot - 75 * DAY },
    { id: "p7", time: pivot - 30 * DAY },
    { id: "p8", time: pivot - 2 * DAY },
  ];
  /* Douze Moments en quatorze heures : c'est là que le fil se superposait. */
  const dayOf = [8, 9, 10, 11, 12, 13.5, 15, 16, 17, 19, 21, 22.5].map(
    (hour, index) => ({
      id: `j${index}`,
      time: pivot - 16 * HOUR + hour * HOUR,
    }),
  );
  const after: TimelineLayoutItem[] = [
    { id: "a1", time: pivot + 2 * DAY },
    { id: "a2", time: pivot + 21 * DAY },
    { id: "a3", time: pivot + 60 * DAY },
  ];
  return [...prep, ...dayOf, ...after];
}

/** Échelle purement linéaire : ce que le fil faisait avant. */
function linearX(time: number, times: number[], start = 1100, end = 2900) {
  const min = Math.min(...times);
  const max = Math.max(...times);
  if (max === min) return (start + end) / 2;
  return start + ((time - min) / (max - min)) * (end - start);
}

describe("layoutTimeline", () => {
  it("ne place rien sur un fil vide et centre un Moment isolé", () => {
    expect(layoutTimeline([])).toEqual({
      markers: [],
      trackEnd: DEFAULT_TIMELINE_LAYOUT.end,
    });
    const single = layoutTimeline([{ id: "s", time: 500 }]);
    expect(single.markers).toHaveLength(1);
    expect(single.markers[0].x).toBe(2000);
    expect(single.markers[0].showLabel).toBe(true);
  });

  it("suit l'ordre des dates quel que soit l'ordre d'arrivée", () => {
    const shuffled = [
      { id: "c", time: 300 },
      { id: "a", time: 100 },
      { id: "b", time: 200 },
    ];
    const { markers } = layoutTimeline(shuffled);
    expect(markers.map(marker => marker.id)).toEqual(["a", "b", "c"]);
    for (let i = 1; i < markers.length; i += 1) {
      expect(markers[i].x).toBeGreaterThan(markers[i - 1].x);
    }
  });

  it("reste stable pour deux Moments à la même heure", () => {
    const tie = [
      { id: "z", time: 100 },
      { id: "a", time: 100 },
    ];
    const first = layoutTimeline(tie);
    const second = layoutTimeline([...tie].reverse());
    expect(first.markers.map(m => m.id)).toEqual(["a", "z"]);
    expect(second.markers.map(m => m.id)).toEqual(["a", "z"]);
    expect(first.markers[1].x - first.markers[0].x).toBeGreaterThanOrEqual(
      DEFAULT_TIMELINE_LAYOUT.markerWidth,
    );
  });

  it("garantit l'écart minimal entre deux repères consécutifs", () => {
    /* Douze Moments dans la même minute : le pire cas du Jour J. */
    const pile = Array.from({ length: 12 }, (_, i) => ({ id: `e${i}`, time: 1000 + i }));
    const { markers } = layoutTimeline(pile);
    for (let i = 1; i < markers.length; i += 1) {
      expect(markers[i].x - markers[i - 1].x).toBeGreaterThanOrEqual(
        DEFAULT_TIMELINE_LAYOUT.markerWidth,
      );
    }
  });

  it("rend le Jour J lisible là où l'échelle linéaire empilait tout", () => {
    const items = weddingProject();
    const times = items.map(item => item.time);
    const { markers } = layoutTimeline(items);
    const byId = new Map(markers.map(marker => [marker.id, marker]));
    const dayOf = items.filter(item => item.id.startsWith("j"));

    /* Avant : sur 1 800 px, deux Moments du Jour J tombaient à moins de 8 px. */
    const linearGaps = dayOf
      .slice(1)
      .map((item, i) => linearX(item.time, times) - linearX(dayOf[i].time, times));
    expect(Math.max(...linearGaps)).toBeLessThan(8);

    /* Après : chaque Moment du Jour J a son espace, étiquette comprise. */
    for (let i = 1; i < dayOf.length; i += 1) {
      const gap = byId.get(dayOf[i].id)!.x - byId.get(dayOf[i - 1].id)!.x;
      expect(gap).toBeGreaterThanOrEqual(DEFAULT_TIMELINE_LAYOUT.minGap);
    }
    expect(dayOf.every(item => byId.get(item.id)!.showLabel)).toBe(true);
  });

  it("ne superpose jamais deux étiquettes d'une même ligne", () => {
    const { markers } = layoutTimeline(weddingProject());
    const lanes = new Map<string, typeof markers>();
    for (const marker of markers) {
      const key = `${marker.group}:${marker.lane}`;
      lanes.set(key, [...(lanes.get(key) ?? []), marker]);
    }
    for (const [key, lane] of lanes) {
      for (let i = 1; i < lane.length; i += 1) {
        const gap = lane[i].x - lane[i - 1].x;
        const bothLabeled = lane[i].showLabel && lane[i - 1].showLabel;
        /* Deux étiquettes visibles : jamais moins que leur largeur. */
        if (bothLabeled) expect(gap, key).toBeGreaterThanOrEqual(192);
        /* Un bouton seul : jamais moins que sa largeur physique. */
        expect(gap, key).toBeGreaterThanOrEqual(DEFAULT_TIMELINE_LAYOUT.markerWidth);
      }
    }
  });

  it("masque l'étiquette plutôt que de la superposer quand aucune ligne n'a la place", () => {
    /* 40 Moments à la même seconde, une seule ligne : la plupart se masquent. */
    const pile = Array.from({ length: 40 }, (_, i) => ({ id: `e${i}`, time: 1000 }));
    const { markers } = layoutTimeline(pile, { lanes: 1 });
    expect(markers.filter(marker => marker.showLabel).length).toBeLessThan(markers.length);
    /* Le repère reste présent et cliquable quoi qu'il arrive. */
    expect(markers).toHaveLength(40);
  });

  it("donne à chaque groupe ses propres lignes", () => {
    const items: TimelineLayoutItem[] = [
      { id: "m1", time: 100, group: "moment" },
      { id: "r1", time: 120, group: "rsvp", width: 176 },
      { id: "m2", time: 140, group: "moment" },
      { id: "r2", time: 160, group: "rsvp", width: 176 },
    ];
    const { markers } = layoutTimeline(items, {
      groups: { rsvp: { lanes: 2, width: 176 } },
    });
    const byId = new Map(markers.map(marker => [marker.id, marker]));
    /* Les deux groupes peuvent réutiliser le numéro de ligne 0… */
    expect(byId.get("m1")!.lane).toBe(0);
    expect(byId.get("r1")!.lane).toBe(0);
    /* …et les cartes RSVP ne se chevauchent pas entre elles. */
    const rsvps = markers.filter(marker => marker.group === "rsvp");
    expect(rsvps[1].x - rsvps[0].x).toBeGreaterThanOrEqual(176);
  });

  it("borne le fil tant que la largeur physique des boutons le permet", () => {
    /* 200 Moments espacés d'une heure : la part proportionnelle est de 9 px,
       c'est donc le plancher qui décide. 199 × 64 + 1 100 = 13 836 px. */
    const many = Array.from({ length: 200 }, (_, i) => ({ id: `e${i}`, time: 1000 + i * HOUR }));
    const { markers, trackEnd } = layoutTimeline(many);
    expect(markers).toHaveLength(200);
    expect(trackEnd).toBeLessThanOrEqual(DEFAULT_TIMELINE_LAYOUT.maxTrackEnd);
    expect(trackEnd).toBe(1100 + 199 * DEFAULT_TIMELINE_LAYOUT.minGap);
  });

  it("dégrade le plancher jusqu'à la largeur du bouton quand le fil sature", () => {
    /* 400 Moments : 399 × 56 px de boutons ne tiennent pas dans maxTrackEnd.
       La largeur physique d'un bouton est un plancher absolu — on ne peut pas
       empiler 400 boutons de 56 px dans 12 900 px. Le plancher passe donc de
       minGap (64) à markerWidth (56), et c'est lui qui borne le fil. */
    const many = Array.from({ length: 400 }, (_, i) => ({ id: `e${i}`, time: 1000 + i * DAY }));
    const { markers, trackEnd } = layoutTimeline(many);
    expect(markers).toHaveLength(400);
    expect(trackEnd).toBe(1100 + 399 * DEFAULT_TIMELINE_LAYOUT.markerWidth);
    for (let i = 1; i < markers.length; i += 1) {
      expect(markers[i].x - markers[i - 1].x).toBe(DEFAULT_TIMELINE_LAYOUT.markerWidth);
    }
  });

  it("ignore les horodatages invalides sans faire tomber le fil", () => {
    const { markers } = layoutTimeline([
      { id: "ok", time: 100 },
      { id: "nan", time: Number.NaN },
      { id: "inf", time: Number.POSITIVE_INFINITY },
      { id: "ok2", time: 200 },
    ]);
    expect(markers.map(marker => marker.id)).toEqual(["ok", "ok2"]);
  });

  it("garde les grands écarts proportionnels : le fil reste une échelle de temps", () => {
    /* Trois Moments : un écart de 1 jour puis un écart de 100 jours. */
    const { markers } = layoutTimeline([
      { id: "a", time: 0 },
      { id: "b", time: DAY },
      { id: "c", time: 101 * DAY },
    ]);
    const first = markers[1].x - markers[0].x;
    const second = markers[2].x - markers[1].x;
    /* Le plancher s'applique au petit écart, mais le grand reste dominant. */
    expect(second).toBeGreaterThan(first);
  });
});
