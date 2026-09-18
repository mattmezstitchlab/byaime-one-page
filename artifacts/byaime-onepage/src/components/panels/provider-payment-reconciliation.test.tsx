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
