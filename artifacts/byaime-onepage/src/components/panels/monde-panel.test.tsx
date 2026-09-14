import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MondePanel } from "./MondePanel";
import { I18nProvider } from "@/lib/i18n";

vi.mock("@/store/project-store", () => {
  const now = Date.now();
  const project = {
    id: "project-1",
    title: "Test World",
    currency: "EUR",
    pivot: { value: now + 30 * 86_400_000, confidence: "confirme" },
    city: { value: "Lille", confidence: "confirme" },
    venue: { value: null, confidence: "manquant" },
    budget: { value: 30000, confidence: "confirme" },
    guestsCount: { value: 60, confidence: "confirme" },
    guests: [
      { id: "g1", name: "Camille", role: "invite", rsvp: "confirme", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false } },
      { id: "g2", name: "Jules", role: "invite", rsvp: "en_attente", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false } },
    ],
    tables: [{ id: "tb1", name: "Table d'honneur", capacity: 8 }],
    providers: [
      { id: "p1", category: "traiteur", role: "Traiteur", name: "Maison Leroy", status: "devis", amountCents: 620_000 },
      { id: "p2", category: "photo", role: "Photographe", name: "Studio Nord", status: "reserve", amountCents: 180_000 },
    ],
    payments: [{ id: "pay1", label: "Acompte", amountCents: 100_000, at: now, state: "du", providerId: "p1" }],
    tasks: [
      { id: "t1", title: "Relancer le traiteur", phase: "3-6m", status: "en_cours", priority: "haute" },
      { id: "t2", title: "Choisir les faire-part", phase: "6-12m", status: "a_faire", priority: "normale" },
    ],
    documents: [],
    timeline: [],
    logistics: { accommodations: [], shuttles: [], parking: "", accessibility: "", weatherFallback: "", emergencyContacts: [], packing: [] },
    ceremony: { notes: "", menu: "", drinks: "", cake: "", firstDance: "", structure: [], readings: [], vows: [] },
    music: [],
    team: [],
    memories: [],
    memoryChecklist: [],
    messageTemplates: [],
    messageLogs: [],
    media: [],
    messages: [],
    missing: [],
  };
  return {
    useProject: () => ({
      project,
      currentRole: "owner",
      canEdit: true,
      syncStatus: "saved",
      syncError: null,
      apiAvailable: false,
      participantLinks: [],
      refreshParticipantLinks: vi.fn(async () => undefined),
      updateProject: vi.fn(),
      updateEntity: vi.fn(),
      addEntity: vi.fn(() => "new-id"),
      removeEntity: vi.fn(),
    }),
  };
});

const render = (panel: Parameters<typeof MondePanel>[0]["panel"]) =>
  renderToStaticMarkup(
    <I18nProvider initialLocale="fr">
      <MondePanel panel={panel} />
    </I18nProvider>,
  );

/* L'ordre des attributs rendus suit celui du JSX : aria-selected avant data-testid. */
const selectedTab = (markup: string) =>
  [...markup.matchAll(/aria-selected="(\w+)"[^>]*data-testid="pilotage-tab-(\w+)"/g)]
    .find(match => match[1] === "true")?.[2];

/*
 * P3 : une seule fenêtre, un menu de gauche comme liste d'onglets. Ce qui était
 * trois panneaux (Personnes, Prestataires, Tâches) est un panneau « Pilotage »
 * à trois onglets, et les identifiants historiques posent le bon onglet.
 */
describe("MondePanel — la fenêtre unique et ses onglets", () => {
  it("réunit Personnes, Prestataires et Tâches dans Pilotage", () => {
    const markup = render("pilotage");
    expect(markup).toContain('data-testid="pilotage-panel"');
    expect(markup).toContain('data-testid="pilotage-tab-guests"');
    expect(markup).toContain('data-testid="pilotage-tab-providers"');
    expect(markup).toContain('data-testid="pilotage-tab-planning"');
    expect(selectedTab(markup)).toBe("guests");
  });

  it("pose l'onglet demandé par un identifiant historique", () => {
    expect(selectedTab(render("guests"))).toBe("guests");
    expect(selectedTab(render("seating"))).toBe("guests");
    expect(selectedTab(render("providers"))).toBe("providers");
    expect(selectedTab(render("budget"))).toBe("providers");
    expect(selectedTab(render("planning"))).toBe("planning");
  });

  it("rend vraiment le contenu de l'onglet actif", () => {
    expect(render("pilotage")).toContain("Camille");
    expect(render("providers")).toContain("Maison Leroy");
    expect(render("planning")).toContain("Relancer le traiteur");
  });

  it("garde les autres onglets de premier niveau", () => {
    expect(render("documents")).toContain("Galerie unifiée");
    expect(render("logistics")).toBeTruthy();
    expect(render("dayof")).toBeTruthy();
  });
});
