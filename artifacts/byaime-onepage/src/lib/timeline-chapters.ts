import type { TimelineEvent } from "./types";

/*
 * Les chapitres du fil : le nom du moment de la vie où tombe un Moment.
 *
 * Ce fichier existe parce que la même découpe sert plusieurs écrans qui n'ont
 * rien en commun ailleurs : le Monde privé (`UniversalTimeline`) et les visuels
 * du Monde (`world-visuals.ts`). Une recopie aurait fini par diverger —
 * c'est exactement ce que le plan reproche à la pile de serifs recopiée quatre
 * fois avant le lot 1.8.
 *
 * La découpe est pure : elle ne dépend que du temps du Moment, du pivot et de
 * sa phase. Elle est donc testable sans React et sans store.
 */

export const CHAPTER_MONTH = 30 * 86400000;
export const CHAPTER_WEEK = 7 * 86400000;
export const CHAPTER_DAY = 86400000;
export const CHAPTER_HOUR = 3600000;

/** Le sous-chapitre d'un Moment, relatif au pivot du Monde. */
export function getSubchapter(event: TimelineEvent, pivotTime: number): string {
  const diff = event.time - pivotTime;

  if (diff < -24 * CHAPTER_MONTH) return "L'Idée & La Vision";
  if (diff < -18 * CHAPTER_MONTH) return "18 à 24 mois avant";
  if (diff < -12 * CHAPTER_MONTH) return "12 à 18 mois avant";
  if (diff < -9 * CHAPTER_MONTH) return "9 à 12 mois avant";
  if (diff < -6 * CHAPTER_MONTH) return "6 à 9 mois avant";
  if (diff < -3 * CHAPTER_MONTH) return "3 à 6 mois avant";
  if (diff < -1 * CHAPTER_WEEK) return "1 à 3 mois avant";
  if (diff < -1 * CHAPTER_DAY) return "La dernière ligne droite";
  if (diff < 0 && event.phase === "avant") return "La veille";

  if (event.phase === "pendant") {
    if (diff < 9 * CHAPTER_HOUR) return "Le réveil";
    if (diff < 12 * CHAPTER_HOUR) return "Les préparatifs";
    if (diff < 14 * CHAPTER_HOUR) return "Mise en place";
    if (diff < 15.5 * CHAPTER_HOUR) return "L'arrivée des invités";
    if (diff < 17 * CHAPTER_HOUR) return "La cérémonie";
    if (diff < 17.5 * CHAPTER_HOUR) return "Après la cérémonie";
    if (diff < 20 * CHAPTER_HOUR) return "Le cocktail";
    if (diff < 22.5 * CHAPTER_HOUR) return "Le repas";
    if (diff < 23.5 * CHAPTER_HOUR) return "L'ouverture du bal";
    if (diff < 26 * CHAPTER_HOUR) return "La soirée";
    return "Fin de la nuit";
  }

  if (event.phase === "apres") {
    if (diff < 2 * CHAPTER_DAY) return "Le lendemain";
    if (diff < 7 * CHAPTER_DAY) return "Les jours suivants";
    if (diff < 30 * CHAPTER_DAY) return "Les semaines suivantes";
    return "L'héritage vivant";
  }

  return "Jalon";
}

