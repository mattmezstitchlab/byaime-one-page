// @vitest-environment jsdom
import { act, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialProject, parseIntention } from "@/lib/parser";
import { normalizeProject } from "@/lib/project-migration";
import { documentStage } from "@/lib/document-tense";
import type { WorldProject } from "@/lib/types";

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
    canEdit: true,
    currentRole: "owner",
    updateProject: (patch: Partial<WorldProject>) => commit({ ...current, ...patch } as WorldProject),
    updateEntity: (collection: string, id: string, patch: Record<string, unknown>) => {
      const list = (current as unknown as Record<string, { id: string }[]>)[collection] ?? [];
      commit({ ...current, [collection]: list.map(item => (item.id === id ? { ...item, ...patch } : item)) } as unknown as WorldProject);
    },
    addEntity: vi.fn(() => "new"),
    removeEntity: vi.fn(),
  }),
}));

vi.mock("@/components/DispooBanner", () => ({ DispooBanner: () => null }));

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  listeners.clear();
  vi.restoreAllMocks();
});

async function mount() {
  const { ProviderPanel } = await import("./ProviderPanel");
  function Harness() {
    useSyncExternalStore(
      subscribe => { listeners.add(subscribe); return () => listeners.delete(subscribe); },
      () => current,
    );
    return <ProviderPanel />;
  }
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(<Harness />); });
  return container!;
}

describe("intermittents : échéances légales et heures attestées", () => {
  it("déduit les échéances d'un prestataire en cachet, les adopte une par une et compte ses heures", async () => {
    const DAY = 86400000;
    const gigAt = Date.now() + 120 * DAY;
    const text = "Notre mariage le 5 août 2027 à Lyon, 80 invités.";
    current = createInitialProject(parseIntention(text), text);
    commit({
      ...current,
      providers: [{ id: "sax", category: "musique", role: "Saxophoniste", name: "Léo", status: "reserve" }],
      timeline: [{ id: "bal", time: gigAt, durationMinutes: 180, kind: "evenement", title: "Bal", status: "prepare", confidence: "confirme", phase: "pendant", universe: "Mariage", provenance: "real", relations: [{ kind: "provider", id: "sax" }] }],
      documents: [{ id: "f-sax", title: "Cachet répétition.pdf", kind: "facture", providerId: "sax", at: Date.now() - 30 * DAY }],
      payments: [{ id: "pay-sax", label: "Cachet", amountCents: 15000, at: Date.now() - 29 * DAY, state: "paye", providerId: "sax", documentId: "f-sax" }],
    });
    const el = await mount();

    /* Sur facture : ni échéances, ni compteur. */
    expect(el.querySelector("[data-testid=provider-deadlines-sax]")).toBeNull();
    expect(el.querySelector("[data-testid=intermittent-hours]")).toBeNull();

    const employment = el.querySelector<HTMLSelectElement>("[data-testid=provider-employment-sax]")!;
    act(() => {
      employment.value = "guso";
      employment.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(current.providers[0].employment).toBe("guso");

    const box = el.querySelector("[data-testid=provider-deadlines-sax]");
    expect(box, "bloc d'échéances absent").not.toBeNull();
    const items = [...box!.querySelectorAll<HTMLElement>("[data-deadline]")];
    expect(items.map(item => item.dataset.deadline)).toEqual(["declaration_prealable", "declaration_unique"]);
    expect(items.every(item => item.dataset.adopted === "false")).toBe(true);

    /* Adopter la première : un Moment suggéré entre dans la Timeline, l'autre reste proposé. */
    const adopt = items[0].querySelector<HTMLButtonElement>("button")!;
    act(() => adopt.click());
    expect(current.timeline.filter(event => event.provenance === "suggested")).toHaveLength(1);
    expect(current.timeline.find(event => event.provenance === "suggested")).toMatchObject({ status: "a_valider", phase: "avant", dependencyIds: ["bal"] });
    const after = [...el.querySelectorAll<HTMLElement>("[data-testid=provider-deadlines-sax] [data-deadline]")];
    expect(after.map(item => item.dataset.adopted)).toEqual(["true", "false"]);

    /* Le compteur : un cachet attesté = douze heures. */
    const hours = el.querySelector("[data-testid=intermittent-hours]");
    expect(hours?.textContent).toContain("12 h sur 507 h");
    expect(hours?.textContent).toContain("ne garantit aucune ouverture de droits");
  });
});

describe("partie double : l'autre côté du Moment, vu depuis le Monde", () => {
  it("affiche l'état du fait par contrepartie et demande l'attestation par un lien", async () => {
    const DAY = 86400000;
    const gigAt = Date.now() - 20 * DAY;
    const text = "Notre mariage le 5 août 2027 à Lyon, 80 invités.";
    current = createInitialProject(parseIntention(text), text);
    const bal = { id: "bal", time: gigAt, durationMinutes: 180, kind: "evenement" as const, title: "Bal", status: "execute" as const, confidence: "confirme" as const, phase: "pendant" as const, universe: "Mariage", provenance: "real" as const, relations: [{ kind: "provider" as const, id: "sax" }, { kind: "document" as const, id: "f-sax" }] };
    commit({
      ...current,
      providers: [{ id: "sax", category: "musique", role: "Saxophoniste", name: "Léo", status: "reserve", employment: "guso" }],
      timeline: [bal],
      documents: [{ id: "f-sax", title: "Cachet.pdf", kind: "facture", providerId: "sax", at: gigAt }],
      payments: [{ id: "pay-sax", label: "Cachet", amountCents: 15000, at: gigAt + DAY, state: "paye", providerId: "sax", documentId: "f-sax" }],
      attestations: [],
    });
    const posted: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (init?.method === "POST") {
        posted.push(url);
        return new Response(JSON.stringify({ eventId: "bal", providerId: "sax", token: "22222222-2222-2222-2222-222222222222", revoked: false }), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify(posted.length ? [{ eventId: "bal", providerId: "sax", token: "22222222-2222-2222-2222-222222222222", revoked: false }] : []), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => undefined) } });

    const el = await mount();
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    const counterpart = el.querySelector<HTMLElement>("[data-testid=counterpart-bal-sax]");
    expect(counterpart, "état de la contrepartie absent").not.toBeNull();
    expect(counterpart!.dataset.factState).toBe("declare");
    expect(el.querySelector("[data-testid=intermittent-attested]")?.textContent).toContain("Dont 0 h contresignées");

    await act(async () => { el.querySelector<HTMLButtonElement>("[data-testid=counterpart-request-bal-sax]")!.click(); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(posted).toEqual(["/api/projects/" + current.id + "/attestation-links/bal/sax"]);
    expect(el.querySelector("[data-testid=counterpart-bal-sax]")?.textContent).toContain("Copier le lien");

    /* La contrepartie a signé (le serveur a projeté l'écriture) : le Monde le voit sans rien écrire lui-même. */
    const { factView, factViewFingerprint } = await import("@/lib/attestation");
    const hash = factViewFingerprint(factView(bal, "sax", current));
    act(() => commit({ ...current, attestations: [{ id: "a1", eventId: "bal", providerId: "sax", status: "atteste", hash, respondedAt: Date.now(), amountCents: 15000, time: gigAt }] }));
    expect(el.querySelector<HTMLElement>("[data-testid=counterpart-bal-sax]")?.dataset.factState).toBe("atteste");
    expect(el.querySelector("[data-testid=counterpart-request-bal-sax]")).toBeNull();
    expect(el.querySelector("[data-testid=intermittent-attested]")?.textContent).toContain("Dont 12 h contresignées");

    /* Le Monde corrige le montant : la signature ne couvre plus ce fait. */
    act(() => commit({ ...current, payments: [{ ...current.payments[0], amountCents: 20000 }] }));
    expect(el.querySelector<HTMLElement>("[data-testid=counterpart-bal-sax]")?.dataset.factState).toBe("perime");
  });
});

describe("rapprochement paiement ↔ facture", () => {
  it("propose les factures du prestataire en tête et rend la facture désignée un fait", async () => {
    const at = Date.now() - 86400000;
    current = createInitialProject(parseIntention("Notre mariage le 5 août 2027 à Lyon, 80 invités."), "Notre mariage le 5 août 2027 à Lyon, 80 invités.");
    commit({
      ...current,
      providers: [{ id: "p1", category: "traiteur", role: "Traiteur", status: "reserve" }, { id: "p2", category: "photo", role: "Photo", status: "reserve" }],
      documents: [
        { id: "f-traiteur", title: "Facture traiteur.pdf", kind: "facture", providerId: "p1", at },
        { id: "f-photo", title: "Facture photo.pdf", kind: "facture", providerId: "p2", at },
        { id: "devis", title: "Devis.pdf", kind: "devis", providerId: "p1", at },
      ],
      payments: [{ id: "pay", label: "Virement", amountCents: 120000, at, state: "paye" }],
    });
    const el = await mount();

    const select = el.querySelector<HTMLSelectElement>("[data-testid=payment-invoice-pay]");
    expect(select, "sélecteur de facture absent").not.toBeNull();
    const options = [...select!.options].map(option => option.textContent);
    expect(options[0]).toContain("selon le prestataire");
    expect(options).toContain("Facture traiteur.pdf");
    expect(options).toContain("Facture photo.pdf");
    expect(options).not.toContain("Devis.pdf");

    /* Sans prestataire ni choix, le paiement ne rapproche rien. */
    expect(documentStage(current.documents[1], current.payments)).toBe("echeance");

    act(() => {
      select!.value = "f-photo";
      select!.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(current.payments[0].documentId).toBe("f-photo");
    expect(documentStage(current.documents.find(d => d.id === "f-photo")!, current.payments)).toBe("fait");
    expect(documentStage(current.documents.find(d => d.id === "f-traiteur")!, current.payments)).toBe("echeance");

    /* Revenir à « selon le prestataire » efface le lien plutôt que d'écrire une chaîne vide. */
    act(() => {
      const again = el.querySelector<HTMLSelectElement>("[data-testid=payment-invoice-pay]")!;
      again.value = "";
      again.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(current.payments[0].documentId).toBeUndefined();
  });
});
