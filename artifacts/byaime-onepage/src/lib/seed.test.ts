import { describe, expect, it } from 'vitest';
import { createInitialProject, parseIntention } from './parser';
import { normalizeProject } from './project-migration';
import { generateWeddingTimeline } from './seed-data';

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
