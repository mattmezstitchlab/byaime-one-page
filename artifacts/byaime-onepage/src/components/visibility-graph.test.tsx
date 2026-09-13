import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/*
 * Un Monde miniature qui couvre plusieurs catégories : le graphe doit donner à
 * chacune sa propre couleur, y compris pour les éléments masqués au rôle joué.
 */
vi.mock("@/store/project-store", () => {
  /* `vi.mock` est hoisté : rien ne peut venir d'une variable du fichier. */
  const now = Date.UTC(2027, 7, 14, 16, 0, 0);
  const project = {
    id: "p1",
    title: "Mariage de Léa & Paul",
    guests: [
      { id: "g1", name: "Léa Martin", role: "temoin", rsvp: "confirme" },
      { id: "g2", name: "Marc Dubois", role: "famille", rsvp: "en_attente" },
    ],
    tables: [{ id: "t1", name: "Table des témoins", capacity: 8 }],
    providers: [{ id: "pv1", category: "photo", role: "Photographe", name: "Studio Lumière", status: "reserve" }],
    tasks: [{ id: "tk1", title: "Réserver le photographe", status: "a_faire", phase: "6-12m" }],
    payments: [{ id: "pay1", label: "Acompte traiteur", state: "paye", amountCents: 180000, at: now }],
    documents: [{ id: "d1", title: "Contrat du lieu", at: now }],
    music: [{ id: "mu1", title: "Première danse", artist: "Nora", external: false }],
    team: [{ id: "tm1", role: "Coordination", name: "June Plan" }],
    messageLogs: [],
    messageTemplates: [],
    memories: [{ id: "me1", title: "Album du Jour J" }],
    logistics: { accommodations: [], shuttles: [], emergencyContacts: [], packing: [] },
    timeline: [
      {
        id: "m1",
        time: now,
        durationMinutes: 60,
        kind: "evenement",
        title: "Cérémonie",
        status: "prepare",
        phase: "pendant",
        universe: "mariage",
        visibility: "audience",
        relations: [
          { kind: "guest", id: "g1" },
          { kind: "provider", id: "pv1" },
          { kind: "music", id: "mu1" },
        ],
      },
      {
        id: "m2",
        time: now + 3_600_000,
        durationMinutes: 120,
        kind: "evenement",
        title: "Dîner",
        status: "prepare",
        phase: "pendant",
        universe: "mariage",
        visibility: "prive",
        relations: [
          { kind: "payment", id: "pay1" },
          { kind: "document", id: "d1" },
          { kind: "task", id: "tk1" },
          { kind: "table", id: "t1" },
          { kind: "team", id: "tm1" },
          { kind: "memory", id: "me1" },
          { kind: "guest", id: "g2" },
        ],
      },
    ],
  };
  return {
    useProject: () => ({
      project,
      updateEntity: vi.fn(),
      updateProject: vi.fn(),
      removeEntity: vi.fn(),
      canEdit: true,
    }),
  };
});

import { KIND_COLORS, VisibilityGraph } from "./VisibilityGraph";

const css = readFileSync(fileURLToPath(new URL("../index.css", import.meta.url)), "utf8");
/* Blocs de thème : sélecteurs en début de ligne, pour ne pas croiser les
   règles composées du type `:root[data-aime-theme="light"] .aime-world-surface`. */
const at = (pattern: RegExp) => {
  const match = pattern.exec(css);
  if (!match) throw new Error(`Bloc introuvable dans index.css : ${pattern}`);
  return match.index;
};
const darkStart = at(/^:root \{$/m);
const lightStart = at(/^:root\[data-aime-theme="light"\] \{$/m);
const darkThemeStart = at(/^:root\[data-aime-theme="dark"\] \{$/m);
const darkBlock = css.slice(darkStart, lightStart);
const lightBlock = css.slice(lightStart, darkThemeStart);

describe("VisibilityGraph — couleurs par catégorie", () => {
  const markup = renderToStaticMarkup(<VisibilityGraph />);

  it("donne une teinte distincte à chaque catégorie", () => {
    const kinds = Object.keys(KIND_COLORS);
    const colors = Object.values(KIND_COLORS);
    expect(kinds).toHaveLength(12); // 11 familles d'entités + les Moments
    expect(new Set(colors).size).toBe(colors.length);
    for (const color of colors) expect(color).toMatch(/^hsl\(var\(--cat-[a-z]+\)\)$/);
  });

  it("peint chaque pastille avec la couleur de sa catégorie", () => {
    expect(markup).toContain('fill="hsl(var(--cat-guest))"');
    expect(markup).toContain('fill="hsl(var(--cat-provider))"');
    expect(markup).toContain('fill="hsl(var(--cat-music))"');
    // Les Moments gardent le rouge de la marque.
    expect(markup).toContain('fill="hsl(var(--cat-event))"');
    // Aucune pastille ne retombe sur la couleur neutre d'avant.
    expect(markup).not.toContain('fill="hsl(var(--foreground) / 0.8)"');
  });

  it("garde la couleur de catégorie sur un élément masqué (vu comme Invité)", () => {
    // Finances et documents restent réservés : contour plein coloré, intérieur vide.
    expect(markup).toContain('fill="transparent" stroke="hsl(var(--cat-payment))"');
    expect(markup).toContain('fill="transparent" stroke="hsl(var(--cat-document))"');
  });

  it("légende les couleurs réellement présentes dans le Monde", () => {
    expect(markup).toContain('data-testid="graph-legend"');
    const legend = markup.slice(markup.indexOf('data-testid="graph-legend"'), markup.indexOf('min-w-[760px]'));
    for (const label of ["Moment", "Invité", "Prestataire", "Musique", "Paiement", "Document", "Équipe", "Souvenir", "Tâche", "Table"]) {
      expect(legend).toContain(label);
    }
  });

  it("définit chaque teinte dans les deux thèmes", () => {
    expect(darkBlock).toContain("--cat-event:");
    for (const color of Object.values(KIND_COLORS)) {
      const token = color.match(/--cat-[a-z]+/)![0];
      expect(darkBlock, `${token} manquant en thème sombre`).toContain(`${token}:`);
      expect(lightBlock, `${token} manquant en thème clair`).toContain(`${token}:`);
    }
  });
});
