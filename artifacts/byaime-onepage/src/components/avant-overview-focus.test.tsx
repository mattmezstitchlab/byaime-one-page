// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorldFocusRequest } from "@/lib/world-focus";
import { I18nProvider } from "@/lib/i18n";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * Les trois cartes de la tête du mode Avant doivent OUVRIR le panneau qu'elles
 * annoncent. Elles écrivaient seulement en sessionStorage (`queueWorldFocus`),
 * relu une seule fois au montage du Monde : une fois le Monde ouvert, cliquer
 * ne faisait strictement rien. Ce test clique vraiment.
 */

const ctx = vi.hoisted(() => {
  const DAY = 86_400_000;
  const now = Date.now();
  return {
    project: {
      id: "p1",
      currency: "EUR",
      pivot: { value: now + 30 * DAY },
      tasks: [{ id: "t1", title: "Relancer le traiteur", phase: "3-6m", status: "en_cours", priority: "haute" }],
      providers: [{ id: "pr1", category: "traiteur", role: "Traiteur", name: "Maison Leroy", status: "devis", amountCents: 620_000 }],
      payments: [{ id: "pay1", label: "Acompte salle", amountCents: 100_000, at: now, state: "du" }],
      guests: [{ id: "g1", name: "Camille", role: "invite", rsvp: "confirme" }],
      timeline: [],
      memories: [],
    },
  };
});

vi.mock("@/store/project-store", () => ({
  useProject: () => ({ project: ctx.project, currentRole: "owner" }),
}));

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

async function mount() {
  const { AvantOverview } = await import("./AvantOverview");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(<I18nProvider initialLocale="fr"><AvantOverview /></I18nProvider>);
  });
  return container!;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("AvantOverview — les trois cartes ouvrent leur panneau", () => {
  let received: WorldFocusRequest[] = [];
  const listener = (event: Event) => {
    received.push((event as CustomEvent<WorldFocusRequest>).detail);
  };

  beforeEach(() => {
    received = [];
    window.addEventListener("aime:focus-world", listener);
  });

  afterEach(() => {
    window.removeEventListener("aime:focus-world", listener);
  });

  const clickByLabel = async (label: string) => {
    const el = await mount();
    const button = [...el.querySelectorAll<HTMLButtonElement>("button")].find(item => item.textContent?.trim() === label);
    expect(button, `bouton « ${label} » absent`).toBeTruthy();
    act(() => button!.click());
    act(() => root?.unmount());
    root = null;
    container?.remove();
    container = null;
    return received.at(-1);
  };

  it("ouvre le planning depuis la carte Tâches", async () => {
    expect(await clickByLabel("Ouvrir le planning")).toMatchObject({ panel: "planning" });
  });

  it("ouvre les prestataires depuis la carte Prestataires", async () => {
    expect(await clickByLabel("Ouvrir les prestataires")).toMatchObject({ panel: "providers" });
  });

  it("ouvre le budget depuis la carte Argent", async () => {
    expect(await clickByLabel("Ouvrir le budget")).toMatchObject({ panel: "budget" });
  });

  it("ne repeint pas les cartes en jaune (jeton card) : dessin du site", async () => {
    const el = await mount();
    expect(el.innerHTML).not.toContain("bg-card");
    expect(el.innerHTML).toContain("var(--agency-paper)");
  });
});
