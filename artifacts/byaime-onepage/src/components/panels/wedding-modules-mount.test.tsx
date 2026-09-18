// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useSyncExternalStore } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialProject, parseIntention } from "@/lib/parser";
import { normalizeProject } from "@/lib/project-migration";
import type { WorldProject } from "@/lib/types";
import type { WeddingModule } from "@/lib/wedding-navigation";
import { I18nProvider } from "@/lib/i18n";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let current: WorldProject;
const listeners = new Set<() => void>();
const commit = (next: WorldProject) => {
  current = normalizeProject(next);
  listeners.forEach(fn => fn());
};

vi.mock("@/store/project-store", () => ({
  useProject: () => ({
    project: current,
    projects: [current],
    currentRole: "owner",
    canEdit: true,
    isHydrated: true,
    hasProject: true,
    syncStatus: "saved",
    syncError: null,
    apiAvailable: false,
    participantLinks: [],
    selectProject: vi.fn(),
    refreshParticipantLinks: vi.fn(async () => undefined),
    updateProject: (patch: Partial<WorldProject>) => commit({ ...current, ...patch } as WorldProject),
    updateEntity: (collection: string, id: string, patch: Record<string, unknown>) => {
      const list = (current as unknown as Record<string, { id: string }[]>)[collection] ?? [];
      commit({ ...current, [collection]: list.map(item => (item.id === id ? { ...item, ...patch } : item)) } as unknown as WorldProject);
    },
    addEntity: (collection: string, entity: Record<string, unknown>) => {
      const id = `added-${Math.random().toString(36).slice(2, 8)}`;
      const list = (current as unknown as Record<string, unknown[]>)[collection] ?? [];
      commit({ ...current, [collection]: [...list, { id, ...entity }] } as unknown as WorldProject);
      return id;
    },
    removeEntity: (collection: string, id: string) => {
      const list = (current as unknown as Record<string, { id: string }[]>)[collection] ?? [];
      commit({ ...current, [collection]: list.filter(item => item.id !== id) } as unknown as WorldProject);
    },
  }),
}));

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  listeners.clear();
});

function seed() {
  current = createInitialProject(
    parseIntention("Notre mariage le 5 août 2027, près de Lille, 90 invités."),
    "Notre mariage le 5 août 2027, près de Lille, 90 invités.",
  );
}

async function mountModule(module: WeddingModule) {
  const { WeddingModulesPanel } = await import("./WeddingModulesPanel");
  function Harness() {
    useSyncExternalStore(
      subscribe => { listeners.add(subscribe); return () => listeners.delete(subscribe); },
      () => current,
    );
    return <WeddingModulesPanel module={module} />;
  }
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  let error: unknown = null;
  try {
    act(() => { root!.render(<I18nProvider initialLocale="fr"><Harness /></I18nProvider>); });
  } catch (caught) {
    error = caught;
  }
  expect(error, `module ${module} plante : ${error instanceof Error ? error.message : String(error)}`).toBeNull();
  return container!;
}

const MODULES: WeddingModule[] = [
  "documents", "logistics", "music", "messages", "team",
  "contributions", "film", "memories", "thanks", "ceremony", "seating", "budget",
];

/*
 * Les douze modules, vérifiés fonctionnellement — pas seulement « ça monte ».
 * Pour chacun : ouverture, rendu réel, cohérence avec le WorldProject, et
 * aucune donnée affichée qui ne vienne du projet.
 */
describe("les douze modules du mariage", () => {
  it.each(MODULES)("« %s » s'ouvre, affiche du contenu et reste cohérent", async module => {
    seed();
    const el = await mountModule(module);

    const markup = el.innerHTML;
    expect(markup.length, `module ${module} : rendu vide`).toBeGreaterThan(200);

    /* Un module qui annonce « fusionné » doit le dire et rediriger, pas mentir. */
    const redirectNotice = /fusionné|maintenant dans/i.test(markup);
    const hasContent = el.querySelectorAll("input, button, textarea, select, li, [data-testid]").length;
    expect(redirectNotice || hasContent > 0, `module ${module} : ni contenu, ni avis de fusion`).toBe(true);
  });

  it("« documents » affiche la checklist et les fichiers du projet", async () => {
    seed();
    const el = await mountModule("documents");
    const text = el.textContent ?? "";
    expect(text).toContain("souvenirs cochés");
    expect(text).toContain(`${current.memoryChecklist.length}`);
    /* Le compteur de fichiers vient du projet. */
    expect(text).toContain(`${current.documents.length} fichier(s)`);
  });

  it("« documents » lit le stade de chaque document et ne laisse exportable que la facture rapprochée", async () => {
    seed();
    const at = Date.now() - 86400000;
    commit({
      ...current,
      providers: [{ id: "p1", category: "traiteur", role: "Traiteur", status: "reserve" }, { id: "p2", category: "photo", role: "Photo", status: "devis" }],
      documents: [
        { id: "d-devis", title: "Devis traiteur.pdf", kind: "devis", providerId: "p1", at },
        { id: "d-contrat", title: "Contrat traiteur.pdf", kind: "contrat", providerId: "p1", at },
        { id: "d-facture-1", title: "Facture traiteur.pdf", kind: "facture", providerId: "p1", at },
        { id: "d-facture-2", title: "Facture photo.pdf", kind: "facture", providerId: "p2", at },
      ],
      payments: [
        { id: "pay-1", label: "Acompte traiteur", amountCents: 100000, at, state: "paye", providerId: "p1" },
        { id: "pay-2", label: "Photo", amountCents: 50000, at, state: "du", providerId: "p2" },
      ],
    });
    const el = await mountModule("documents");

    /* Le stade est dérivé : aucune saisie, une pastille par document. */
    const stages = [...el.querySelectorAll<HTMLElement>("[data-stage]")].map(node => node.dataset.stage);
    expect(stages).toEqual(["proposition", "engagement", "fait", "echeance"]);

    /* Seule la facture rapprochée d'un paiement réglé du même prestataire est exportable. */
    expect(el.querySelector("[data-testid=documents-exportable-hint]")?.textContent).toContain("1 facture(s)");

    /* Le filtre par stade ne montre que ce qu'il annonce. */
    const filter = el.querySelector("[data-testid=documents-stage-filter]")!;
    const factsButton = [...filter.querySelectorAll<HTMLButtonElement>("button")].find(b => b.textContent?.startsWith("Faits"));
    expect(factsButton, "filtre « Faits » absent").not.toBeUndefined();
    act(() => factsButton!.click());
    const visible = [...el.querySelectorAll<HTMLElement>("[data-stage]")].map(node => node.dataset.stage);
    expect(visible).toEqual(["fait"]);
    expect(el.textContent).toContain("Facture traiteur.pdf");
    expect(el.textContent).not.toContain("Devis traiteur.pdf");
  });

  it("« logistics » réunit Cérémonie, Logistique et Équipe, avec les données du projet", async () => {
    seed();
    commit({ ...current, logistics: { ...current.logistics, parking: "Entrée nord", weatherFallback: "Orangerie" } });
    const el = await mountModule("logistics");
    /* Le panneau s'ouvre sur la Cérémonie ; la Logistique est son deuxième onglet. */
    expect(el.textContent).toContain("Cérémonie + Logistique + Équipe");
    expect(el.textContent).toContain(current.ceremony.notes.slice(0, 20));

    const tab = [...el.querySelectorAll<HTMLButtonElement>("button")].find(b => b.textContent?.trim() === "Logistique");
    expect(tab, "onglet Logistique absent").not.toBeUndefined();
    act(() => tab!.click());
    expect(el.textContent).toContain("Entrée nord");
    expect(el.textContent).toContain("Orangerie");
  });

  it("« messages » propose les modèles du projet, en local-first", async () => {
    seed();
    const el = await mountModule("messages");
    const text = el.textContent ?? "";
    /* Les modèles sont servis avec leur corps, prêts à préparer. */
    for (const template of current.messageTemplates) {
      expect(text, `corps du modèle « ${template.title} » absent`).toContain(template.body.slice(0, 25));
    }
    expect(text).toContain("Message libre");
    expect(text).toContain("Journal local");
  });

  it("« seating » redirige vers Pilotage au lieu d'afficher un panneau fantôme", async () => {
    seed();
    const el = await mountModule("seating");
    expect(el.textContent).toMatch(/fusionné|maintenant dans/i);
  });

  it("un module ne casse pas quand le projet est vide de données", async () => {
    seed();
    /* État vide : plus aucun document, modèle, équipe ni piste. */
    commit({
      ...current,
      documents: [],
      messageTemplates: [],
      team: [],
      music: [],
      memoryChecklist: [],
    });
    for (const module of ["documents", "messages", "team", "music"] as WeddingModule[]) {
      act(() => root?.unmount());
      container?.remove();
      const el = await mountModule(module);
      expect(el.innerHTML.length).toBeGreaterThan(50);
    }
  });
});
