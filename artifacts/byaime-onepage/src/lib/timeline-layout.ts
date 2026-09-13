/*
 * Placement des repères sur le fil horizontal.
 *
 * Le fil mappe du temps sur des pixels. L'échelle purement linéaire de
 * `createTimelinePositioner` est inutilisable pour un projet réel : le Jour J
 * concentre une quinzaine de Moments en quelques heures, soit une fraction
 * infime de l'échelle d'un projet qui court sur un an. Mesuré sur un projet
 * créé depuis une intention réelle, l'écart minimal entre deux repères tombe à
 * 0,03 px — pour des boutons de 56 px et des étiquettes de 192 px. Tout
 * s'empile au même endroit.
 *
 * Ce module corrige ça sans changer la nature du fil :
 *
 *  1. **Échelle élastique.** Chaque écart entre deux Moments reçoit sa part
 *     proportionnelle de la largeur, avec un plancher (`minGap`). Les grands
 *     écarts gardent leur proportion ; les écarts minuscules sont élargis au
 *     plancher. Le Jour J redevient lisible sans écraser le reste.
 *  2. **Répartition en lignes.** Deux étiquettes d'une même ligne ne se
 *     chevauchent jamais : le repère suivant passe à la ligne d'à côté. Quand
 *     aucune ligne n'a la place, l'étiquette est masquée (`showLabel: false`)
 *     plutôt que superposée — le repère reste cliquable.
 *
 * Tout est pur : aucune mesure du DOM, aucun état. Les garanties ci-dessus sont
 * vérifiées par `timeline-layout.test.ts`.
 */

export type TimelineLayoutItem = {
  id: string;
  time: number;
  /**
   * Groupe visuel. Chaque groupe a ses propres lignes : un repère « moment » et
   * un repère « rsvp » peuvent donc porter le même numéro de ligne sans se
   * chevaucher, c'est le rendu qui les place sur des bandes différentes.
   */
  group?: string;
  /** Largeur réelle de l'étiquette ou de la carte de ce repère, en px. */
  width?: number;
};

export type TimelineGroupOptions = {
  /** Nombre de lignes empilées pour ce groupe (défaut : `lanes`). */
  lanes?: number;
  /** Largeur par défaut des étiquettes du groupe (défaut : `width`). */
  width?: number;
};

export type TimelineLayoutOptions = {
  /** Abscisse du premier repère. */
  start?: number;
  /** Abscisse visée du dernier repère, avant débordement. */
  end?: number;
  /** Écart minimal garanti entre deux repères consécutifs, en px. */
  minGap?: number;
  /** Largeur d'un bouton repère : l'écart physique indépassable. */
  markerWidth?: number;
  /** Nombre de lignes disponibles par groupe. */
  lanes?: number;
  /** Largeur par défaut d'une étiquette. */
  width?: number;
  /**
   * Au-delà, le plancher se réduit plutôt que de produire un fil infini.
   * Limite souple : `markerWidth` reste un plancher absolu, donc un projet dont
   * les boutons ne tiennent physiquement pas dans cette largeur produira un fil
   * plus long — on ne superpose jamais deux boutons pour tenir une cible.
   */
  maxTrackEnd?: number;
  groups?: Record<string, TimelineGroupOptions>;
};

export type TimelineMarkerLayout = {
  id: string;
  group: string;
  x: number;
  /** Index de ligne DANS le groupe du repère. */
  lane: number;
  /** Faux quand aucune ligne n'a la place : l'étiquette doit être masquée. */
  showLabel: boolean;
};

export type TimelineLayout = {
  markers: TimelineMarkerLayout[];
  /**
   * Abscisse du dernier repère. Le canvas doit être au moins aussi large, sinon
   * la fin du fil est rognée.
   */
  trackEnd: number;
};

export const DEFAULT_TIMELANE_GROUP = "moment";

export const DEFAULT_TIMELINE_LAYOUT = {
  start: 1100,
  end: 2900,
  minGap: 64,
  markerWidth: 56,
  lanes: 4,
  width: 192,
  maxTrackEnd: 14000,
} as const;

export function layoutTimeline(
  items: TimelineLayoutItem[],
  options: TimelineLayoutOptions = {},
): TimelineLayout {
  const {
    start = DEFAULT_TIMELINE_LAYOUT.start,
    end = DEFAULT_TIMELINE_LAYOUT.end,
    minGap = DEFAULT_TIMELINE_LAYOUT.minGap,
    markerWidth = DEFAULT_TIMELINE_LAYOUT.markerWidth,
    lanes = DEFAULT_TIMELINE_LAYOUT.lanes,
    width = DEFAULT_TIMELINE_LAYOUT.width,
    maxTrackEnd = DEFAULT_TIMELINE_LAYOUT.maxTrackEnd,
    groups = {},
  } = options;

  const usable = items.filter(item => Number.isFinite(item.time));
  if (usable.length === 0) return { markers: [], trackEnd: end };

  /* Tri par date, puis par identifiant : un fil ne dépend pas de l'ordre
     d'arrivée des données, et deux Moments à la même heure restent stables. */
  const sorted = [...usable].sort(
    (a, b) => a.time - b.time || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );

  if (sorted.length === 1) {
    const x = start + Math.max(0, end - start) / 2;
    return {
      markers: [{
        id: sorted[0].id,
        group: sorted[0].group ?? DEFAULT_TIMELANE_GROUP,
        x,
        lane: 0,
        showLabel: true,
      }],
      trackEnd: x,
    };
  }

  /*
   * Plancher effectif. `minGap` est la cible, mais un projet de 300 Moments ne
   * doit pas produire un fil de 20 000 px : au-delà de `maxTrackEnd`, le
   * plancher se réduit — sans jamais descendre sous la largeur physique d'un
   * bouton, sinon les repères se recouvriraient de nouveau.
   */
  const roomPerGap = (maxTrackEnd - start) / (sorted.length - 1);
  const floorGap = Math.max(markerWidth, Math.min(minGap, roomPerGap));

  /* 1) Échelle élastique : part proportionnelle, avec plancher. */
  const gaps: number[] = [];
  let totalGap = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = Math.max(0, sorted[i].time - sorted[i - 1].time);
    gaps.push(gap);
    totalGap += gap;
  }
  const available = Math.max(0, end - start);
  const xs: number[] = [start];
  for (let i = 0; i < gaps.length; i += 1) {
    const proportional = totalGap > 0
      ? (available * gaps[i]) / totalGap
      : available / gaps.length;
    xs.push(xs[i] + Math.max(floorGap, proportional));
  }

  /* 2) Répartition en lignes, groupe par groupe. */
  const laneCursor = new Map<string, number[]>();
  const markers: TimelineMarkerLayout[] = sorted.map((item, index) => {
    const group = item.group ?? DEFAULT_TIMELANE_GROUP;
    const groupOptions = groups[group] ?? {};
    const laneCount = Math.max(1, groupOptions.lanes ?? lanes);
    const labelWidth = Math.max(markerWidth, item.width ?? groupOptions.width ?? width);
    const x = xs[index];

    let last = laneCursor.get(group);
    if (!last || last.length !== laneCount) {
      last = new Array<number>(laneCount).fill(Number.NEGATIVE_INFINITY);
      laneCursor.set(group, last);
    }

    /* Première ligne ayant la place pour l'étiquette entière… */
    let lane = last.findIndex(previous => x - previous >= labelWidth);
    let showLabel = true;
    if (lane === -1) {
      /* …sinon une ligne où le bouton seul tient, étiquette masquée… */
      lane = last.findIndex(previous => x - previous >= markerWidth);
      showLabel = false;
    }
    if (lane === -1) {
      /* …sinon la ligne la moins encombrée. Le repère reste cliquable. */
      lane = last.indexOf(Math.min(...last));
      showLabel = false;
    }

    last[lane] = x;
    return { id: item.id, group, x, lane, showLabel };
  });

  return { markers, trackEnd: xs[xs.length - 1] };
}
