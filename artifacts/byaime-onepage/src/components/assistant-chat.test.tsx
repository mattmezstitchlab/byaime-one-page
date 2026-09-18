// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import { createInitialProject, parseIntention } from "@/lib/parser";
import type { WorldProject } from "@/lib/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const assistant = vi.hoisted(() => ({
  ask: vi.fn(async () => ({ answer: "Je peux préparer ces informations.", sources: [], mode: "local" as const })),
  update: vi.fn(),
  applyPlan: vi.fn(),
  rejectPlan: vi.fn(),
}));

const project = createInitialProject(
  parseIntention("Notre mariage le 5 août 2027, près de Lille, 90 invités."),
  "Notre mariage le 5 août 2027, près de Lille, 90 invités.",
);

vi.mock("@/lib/assistant", () => ({
  askAssistant: assistant.ask,
  assistantSuggestions: () => [],
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/store/project-store", () => ({
  useProject: () => ({ project, currentRole: "owner" }),
}));

import { AssistantChat } from "./AssistantChat";

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  assistant.ask.mockClear();
  assistant.update.mockClear();
  assistant.applyPlan.mockClear();
  assistant.rejectPlan.mockClear();
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container!);
    root.render(
      <I18nProvider initialLocale="fr">
        <AssistantChat
          onApplyProject={assistant.update as (updates: Partial<WorldProject>) => void}
          onApplyProposal={assistant.applyPlan}
          onRejectProposal={assistant.rejectPlan}
        />
      </I18nProvider>,
    );
  });
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

async function ask(message: string) {
  const input = container!.querySelector<HTMLInputElement>("#assistant-chat-input")!;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(input, message);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    container!.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
  for (let attempt = 0; attempt < 10 && !container!.querySelector('[data-testid^="assistant-preview-"]'); attempt++) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 5));
    });
  }
}

describe("AssistantChat — proposition confirmée", () => {
  it("montre les champs compris et n'écrit rien avant confirmation", async () => {
    await ask("Notre mariage le 14 août 2027 près de Lille, 120 invités, budget 20 000 €.");

    expect(assistant.ask).toHaveBeenCalledTimes(1);
    expect(container!.querySelector('[data-testid^="assistant-preview-"]')?.textContent).toContain("Lille");
    expect(container!.textContent).toContain("120 invités");
    expect(container!.textContent).toContain("20 000 €");
    expect(assistant.update).not.toHaveBeenCalled();
  });

  it("applique le brouillon uniquement sur le bouton de confirmation", async () => {
    await ask("Notre mariage le 14 août 2027 près de Lille, 120 invités, budget 20 000 €.");
    const button = container!.querySelector<HTMLButtonElement>('[data-testid^="assistant-fill-"]')!;

    act(() => button.click());

    expect(assistant.update).toHaveBeenCalledTimes(1);
    expect(assistant.update.mock.calls[0][0]).toMatchObject({
      city: { value: expect.stringContaining("Lille") },
      guestsCount: { value: 120 },
      budget: { value: 20000 },
      currency: "EUR",
    });
    expect(button.textContent).toContain("Monde prérempli");
  });
});

describe("AssistantChat — passe d'orchestration", () => {
  it("montre une passe inspectable et attend la validation avant d'appeler le store", async () => {
    await ask("Notre mariage le 21 août 2027 près de Paris, 80 invités, budget 20 000 €.");

    expect(container!.querySelector('[data-testid="aime-proposal-review"]')).toBeTruthy();
    expect(container!.querySelector('[data-testid="aime-proposal-apply"]')).toBeTruthy();
    expect(assistant.applyPlan).not.toHaveBeenCalled();
  });

  it("applique uniquement après le bouton de la passe", async () => {
    await ask("Notre mariage le 21 août 2027 près de Paris, 80 invités, budget 20 000 €.");
    const button = container!.querySelector<HTMLButtonElement>('[data-testid="aime-proposal-apply"]')!;

    act(() => button.click());

    expect(assistant.applyPlan).toHaveBeenCalledTimes(1);
    expect(container!.querySelector('[data-testid="aime-proposal-applied"]')?.textContent).toContain("journalisée");
  });
});
