import { describe, expect, it } from 'vitest';
import { createInitialProject, parseIntention } from './parser';
import { normalizeProject } from './project-migration';
import { ceremonyHourFromIntention, DEFAULT_CEREMONY_HOUR, generateWeddingTimeline } from './seed-data';
import type { TimelineEvent } from './types';

describe('generateWeddingTimeline', () => {
  it('should generate between 45 and 60 events', () => {
    const events = generateWeddingTimeline(Date.now(), "Mariage", "Intention");
    expect(events.length).toBeGreaterThanOrEqual(45);
    expect(events.length).toBeLessThanOrEqual(60);
  });

  it('should contain all required chapters conceptually', () => {
    const events = generateWeddingTimeline(Date.now(), "Mariage", "Intention");
    const titles = events.map(e => e.title);
    
    // Idea & Vision
    expect(titles).toContain("L'intention posée");
    // Mid preparation
    expect(titles).toContain("La découverte du lieu");
    expect(titles).toContain("Envoi des invitations");
    // Final week / Eve
    expect(titles).toContain("Dernier point");
    expect(titles).toContain("Arrivée");
    // Day of (early morning / prep)
    expect(titles).toContain("Réveil");
    expect(titles).toContain("Le temps pour soi");
    // Ceremony
    expect(titles).toContain("L'engagement");
    // Party
    expect(titles).toContain("L'ouverture du bal");
    // After
    expect(titles).toContain("Le retour à la réalité");
    expect(titles).toContain("Les mots doux");
    expect(titles).toContain("Le film");
  });

  it('should preserve necessary legacy relations and IDs', () => {
    const events = generateWeddingTimeline(Date.now(), "Mariage", "Intention");
    
    // Check IDs exist
    const requiredIds = ["t2", "dj1", "dj3", "dj5", "dj6", "after1"];
    for (const id of requiredIds) {
      const ev = events.find(e => e.id === id);
      expect(ev).toBeDefined();
    }

    // Check specific relationships for dj3
    const dj3 = events.find(e => e.id === "dj3");
    expect(dj3?.relations?.some(r => r.kind === "music" && r.id === "m2")).toBe(true);
    expect(dj3?.relations?.some(r => r.kind === "provider" && r.id === "p3")).toBe(true);
  });

  it('enriches only short legacy wedding seeds without replacing their events', () => {
    const current = createInitialProject(
      parseIntention("Mariage le 14 août 2027 à Lille"),
      "Mariage le 14 août 2027 à Lille"
    );
    const legacyEvent = { ...current.timeline.find(event => event.id === "dj3")!, title: "Notre cérémonie personnalisée" };
    const legacy = {
      ...current,
      storyVersion: undefined,
      timeline: [
        current.timeline.find(event => event.id === "t1")!,
        current.timeline.find(event => event.id === "t2")!,
        legacyEvent,
      ],
    };

    const migrated = normalizeProject(legacy);
    expect(migrated.timeline.length).toBeGreaterThanOrEqual(45);
    expect(migrated.timeline.find(event => event.id === "dj3")?.title).toBe("Notre cérémonie personnalisée");

    const detailed = { ...legacy, timeline: current.timeline.slice(0, 20) };
    expect(normalizeProject(detailed).timeline).toHaveLength(20);
  });
});

/*
 * L'ancre cérémonie du Jour J : le déroulé généré est exprimé en décalages
 * autour de l'heure de cérémonie, plus en heures fixes depuis le pivot. Sans
 * heure dans l'intention, l'ancre reste 16 h — le comportement historique.
 */
describe("l'ancre cérémonie du Jour J", () => {
  /** Samedi 14 août 2027, minuit *local* : la base du déroulé, quel que soit le fuseau. */
  const PIVOT_MINUIT = new Date(2027, 7, 14, 0, 0, 0, 0).getTime();
  const at = (hour: number, minute = 0) => new Date(2027, 7, 14, hour, minute).getTime();
  const byId = (events: TimelineEvent[], id: string) => {
    const event = events.find(item => item.id === id);
    expect(event, `l'événement « ${id} » doit exister`).toBeDefined();
    return event!;
  };
  const clockOf = (event: TimelineEvent) => {
    const date = new Date(event.time);
    return [date.getHours(), date.getMinutes()];
  };

  it("lit l'heure de cérémonie dans l'intention, et rien sinon", () => {
    expect(ceremonyHourFromIntention("Notre mariage le 14 août 2027, cérémonie à 15h")).toBe(15);
    expect(ceremonyHourFromIntention("Ceremonie a 15h30 à Lille")).toBe(15.5);
    expect(ceremonyHourFromIntention("la cérémonie, à 9 heures, en plein air")).toBe(9);
    expect(ceremonyHourFromIntention("à 16h précises, la cérémonie")).toBe(16);
    expect(ceremonyHourFromIntention("Our wedding ceremony at 3pm")).toBe(15);
    expect(ceremonyHourFromIntention("Mariage le 14 août 2027, à 16h")).toBe(16); // langage courant
    expect(ceremonyHourFromIntention("Mariage le 14 août 2027 près de Lille, 90 invités")).toBeNull();
    expect(ceremonyHourFromIntention("cérémonie à 25h")).toBeNull(); // invalide = absent
    expect(ceremonyHourFromIntention("")).toBeNull();
    expect(DEFAULT_CEREMONY_HOUR).toBe(16);
  });

  it("cérémonie à 15h : les étapes du Jour J se calculent autour de 15h", () => {
    const events = generateWeddingTimeline(PIVOT_MINUIT, "Mariage", "Notre mariage le 14 août 2027, cérémonie à 15h");
    expect(clockOf(byId(events, "dj3"))).toEqual([15, 0]);      // l'ancre
    expect(clockOf(byId(events, "dj2"))).toEqual([13, 30]);     // première rencontre : -1,5 h
    expect(clockOf(events.find(event => event.title === "L'accueil")!)).toEqual([14, 15]); // -45 min
    expect(clockOf(byId(events, "dj1"))).toEqual([9, 0]);       // préparatifs : -6 h
    expect(clockOf(events.find(event => event.title === "Réveil")!)).toEqual([6, 0]);     // -9 h
    expect(clockOf(byId(events, "dj5"))).toEqual([19, 30]);     // banquet : +4,5 h
    expect(clockOf(byId(events, "dj6"))).toEqual([22, 0]);      // bal : +7 h
    const brunch = byId(events, "after1");
    expect(new Date(brunch.time).getDate()).toBe(15);           // le lendemain…
    expect(clockOf(brunch)).toEqual([9, 0]);                    // …à 9 h : ancre + 18 h
  });

  it("cérémonie à 16h : tout le déroulé glisse d'une heure avec l'ancre", () => {
    const a15 = generateWeddingTimeline(PIVOT_MINUIT, "Mariage", "cérémonie à 15h");
    const a16 = generateWeddingTimeline(PIVOT_MINUIT, "Mariage", "cérémonie à 16h");
    const pendant = (events: TimelineEvent[]) => events.filter(event => event.phase === "pendant");
    expect(pendant(a16)).toHaveLength(pendant(a15).length);
    for (const [index, event] of pendant(a16).entries()) {
      expect(event.time - pendant(a15)[index].time).toBe(3600000); // +1 h, étape par étape
    }
    expect(clockOf(byId(a16, "dj3"))).toEqual([16, 0]);
    expect(clockOf(byId(a16, "dj6"))).toEqual([23, 0]);
  });

  it("les relations existantes et les identifiants stables sont conservés", () => {
    const events = generateWeddingTimeline(PIVOT_MINUIT, "Mariage", "cérémonie à 15h");
    const dj3 = byId(events, "dj3");
    expect(dj3.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "provider", id: "p3" }),
      expect.objectContaining({ kind: "music", id: "m2" }),
      expect.objectContaining({ kind: "guest", id: "g1" }),
    ]));
    expect(dj3.dependencyIds).toContain("dj1");
    expect(byId(events, "dj5").relations).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "provider", id: "p2" }),
      expect.objectContaining({ kind: "table", id: "tb1" }),
    ]));
    expect(byId(events, "dj6").relations).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "provider", id: "p4" }),
      expect.objectContaining({ kind: "music", id: "m3" }),
    ]));
    expect(byId(events, "dj1").relations).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "team", id: "tm2" }),
    ]));
    // Le photographe du Monde (p3), déjà présent, couvre aussi la découverte des tenues.
    expect(byId(events, "dj2").relations).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "provider", id: "p3" }),
    ]));
    for (const id of ["t1", "t2", "dj1", "dj2", "dj3", "dj4", "dj5", "dj6", "dj7", "after1", "after2", "after3"]) {
      expect(events.some(event => event.id === id), id).toBe(true);
    }
  });

  it("les phases Avant / Pendant / Après restent correctes", () => {
    const events = generateWeddingTimeline(PIVOT_MINUIT, "Mariage", "cérémonie à 15h");
    expect(byId(events, "t1").phase).toBe("avant");
    expect(byId(events, "t2").phase).toBe("avant");
    for (const id of ["dj1", "dj2", "dj3", "dj4", "dj5", "dj6", "dj7"]) {
      expect(byId(events, id).phase, id).toBe("pendant");
    }
    expect(byId(events, "after1").phase).toBe("apres");
    expect(byId(events, "after2").phase).toBe("apres");
  });

  it("aucun déroulé généré ne devient incohérent, même avec une ancre tôt ou tard", () => {
    for (const hour of [10, 12, 14, 15, 16, 18, 20, 22]) {
      const events = generateWeddingTimeline(PIVOT_MINUIT, "Mariage", `cérémonie à ${hour}h`);
      const ids = new Set(events.map(event => event.id));
      expect(ids.size, "identifiants uniques").toBe(events.length);
      expect([...events].sort((a, b) => a.time - b.time)).toEqual(events);
      const pendant = events.filter(event => event.phase === "pendant");
      for (const [index, event] of pendant.entries()) {
        expect(Number.isFinite(event.time), `${event.id} : temps fini`).toBe(true);
        expect(event.durationMinutes ?? 60, `${event.id} : durée positive`).toBeGreaterThan(0);
        if (index > 0) expect(event.time, `${event.id} : ordre strict`).toBeGreaterThan(pendant[index - 1].time);
        expect(event.time).toBeGreaterThanOrEqual(PIVOT_MINUIT);
        expect(event.time).toBeLessThanOrEqual(PIVOT_MINUIT + 36 * 3600000);
      }
      const accueil = events.find(event => event.title === "L'accueil")!;
      const dj3 = byId(events, "dj3");
      const sortie = events.find(event => event.title === "La sortie")!;
      expect(accueil.time, `cérémonie ${hour} h : l'accueil reste avant`).toBeLessThan(dj3.time);
      expect(sortie.time, `cérémonie ${hour} h : la sortie reste après`).toBeGreaterThan(dj3.time);
      // L'ancre elle-même tombe pile sur l'heure demandée.
      expect(clockOf(dj3)).toEqual([hour, 0]);
    }
  });

  it("sans heure de cérémonie : le comportement historique est intact", () => {
    const events = generateWeddingTimeline(PIVOT_MINUIT, "Mariage", "Notre mariage le 14 août 2027 près de Lille");
    const HOUR = 3600000;
    expect(byId(events, "dj3").time).toBe(PIVOT_MINUIT + 16 * HOUR);
    expect(byId(events, "dj1").time).toBe(PIVOT_MINUIT + 10 * HOUR);
    expect(byId(events, "dj6").time).toBe(PIVOT_MINUIT + 23 * HOUR);
    expect(byId(events, "after1").time).toBe(PIVOT_MINUIT + 34 * HOUR);
    expect(events.find(event => event.title === "Réveil")!.time).toBe(PIVOT_MINUIT + 7 * HOUR);
    // Et l'heure du pivot ne fuit plus dans le déroulé (le germe pose parfois 12 h).
    const pivotMidi = new Date(2027, 7, 14, 12, 0, 0, 0).getTime();
    const aMidi = generateWeddingTimeline(pivotMidi, "Mariage", "Notre mariage le 14 août 2027, cérémonie à 15h");
    expect(clockOf(byId(aMidi, "dj3"))).toEqual([15, 0]);
    const sansHeure = generateWeddingTimeline(pivotMidi, "Mariage", "Notre mariage le 14 août 2027");
    expect(clockOf(byId(sansHeure, "dj3"))).toEqual([16, 0]);
  });

  it("une cérémonie tôt compresse les préparatifs sans jamais inverser le déroulé", () => {
    const events = generateWeddingTimeline(PIVOT_MINUIT, "Mariage", "cérémonie à 12h");
    expect(clockOf(byId(events, "dj3"))).toEqual([12, 0]);                     // l'ancre d'abord
    const reveil = events.find(event => event.title === "Réveil")!;
    const [reveilH] = clockOf(reveil);
    expect(reveilH).toBeGreaterThanOrEqual(6);                                  // jamais avant 6 h
    const accueil = events.find(event => event.title === "L'accueil")!;
    const [accueilH, accueilMin] = clockOf(accueil);
    expect(accueilH * 60 + accueilMin).toBeLessThan(12 * 60); // encore avant l'ancre
    expect(clockOf(byId(events, "dj5"))).toEqual([16, 30]);                    // l'après ne bouge pas
  });
});
