// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttestationPage } from "./AttestationPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.restoreAllMocks();
});

const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };

const fact = { eventId: "bal", providerId: "sax", title: "Bal", time: Date.UTC(2026, 7, 1, 20), endTime: Date.UTC(2026, 7, 1, 23), location: "Orangerie", amountCents: 15_000, documentIds: ["f-sax"], paymentIds: ["p1"] };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function mount(token = "11111111-1111-1111-1111-111111111111") {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<AttestationPage params={{ token }} />); });
  await flush();
  return container!;
}

describe("la page de la contrepartie", () => {
  it("montre le fait et l'attestation d'un clic, avec l'empreinte lue", async () => {
    let history: Array<{ status: string; hash: string; respondedAt: string; amountCents: number }> = [];
    const posted: unknown[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (init?.method === "POST") {
        posted.push(JSON.parse(String(init.body)));
        history = [...history, { status: "atteste", hash: "abcd1234", respondedAt: "2026-09-18T10:00:00Z", amountCents: 15_000 }];
        return json(201, { id: "a1" });
      }
      expect(url).toBe("/api/attestation/11111111-1111-1111-1111-111111111111");
      return json(200, { projectTitle: "Mariage de Camille & Jules", providerName: "Léo", fact, hash: "abcd1234", history, attested: history.some(h => h.status === "atteste" && h.hash === "abcd1234") });
    });
    const el = await mount();

    expect(el.querySelector("[data-testid=attestation-title]")?.textContent).toBe("Mariage de Camille & Jules");
    expect(el.textContent).toContain("Bonjour Léo");
    expect(el.querySelector("[data-testid=attestation-fact]")?.getAttribute("data-hash")).toBe("abcd1234");
    expect(el.querySelector("[data-testid=attestation-amount]")?.textContent).toMatch(/150/);
    expect(el.querySelector("[data-testid=attestation-state]")?.getAttribute("data-state")).toBe("declare");
    /* Aucun champ d'avis : deux boutons, rien d'autre. */
    expect(el.querySelectorAll("input, textarea, select")).toHaveLength(0);

    await act(async () => { el.querySelector<HTMLButtonElement>("[data-testid=attestation-accept]")!.click(); });
    await flush();

    expect(posted).toEqual([{ status: "atteste", hash: "abcd1234" }]);
    expect(el.querySelector("[data-testid=attestation-state]")?.getAttribute("data-state")).toBe("atteste");
    expect(el.querySelector("[data-testid=attestation-message]")?.textContent).toContain("attesté des deux côtés");
    expect(el.querySelector("[data-testid=attestation-history]")?.textContent).toContain("exact");
  });

  it("contester demande une phrase sur le fait et l'envoie avec l'empreinte", async () => {
    const posted: unknown[] = [];
    let history: Array<{ status: string; hash: string; respondedAt: string; amountCents: number; note?: string }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        posted.push(body);
        history = [...history, { status: "conteste", hash: "abcd1234", respondedAt: "2026-09-18T10:00:00Z", amountCents: 15_000, note: body.note }];
        return json(201, { id: "a1" });
      }
      return json(200, { projectTitle: "M", providerName: "Léo", fact, hash: "abcd1234", history, attested: false });
    });
    const el = await mount();
    await act(async () => { el.querySelector<HTMLButtonElement>("[data-testid=attestation-contest]")!.click(); });
    const note = el.querySelector<HTMLInputElement>("[data-testid=attestation-note]")!;
    expect(note.maxLength).toBe(280);
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(note, "Le cachet était de 200 €.");
      note.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => { el.querySelector<HTMLButtonElement>("[data-testid=attestation-contest-confirm]")!.click(); });
    await flush();
    expect(posted).toEqual([{ status: "conteste", hash: "abcd1234", note: "Le cachet était de 200 €." }]);
    expect(el.querySelector("[data-testid=attestation-state]")?.getAttribute("data-state")).toBe("conteste");
    expect(el.textContent).toContain("« Le cachet était de 200 €. »");
  });

  it("ne signe jamais à l'aveugle : un 409 recharge le fait au lieu de l'attester", async () => {
    let hash = "abcd1234";
    let amount = 15_000;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      if (init?.method === "POST") {
        /* Le fait a changé côté Monde entre la lecture et le clic. */
        hash = "ffff0000";
        amount = 20_000;
        return json(409, { error: "Ce Moment a changé depuis votre lecture. Relisez-le avant de répondre." });
      }
      return json(200, { projectTitle: "M", providerName: "Léo", fact: { ...fact, amountCents: amount }, hash, history: [], attested: false });
    });
    const el = await mount();
    await act(async () => { el.querySelector<HTMLButtonElement>("[data-testid=attestation-accept]")!.click(); });
    await flush();
    expect(el.querySelector("[data-testid=attestation-state]")?.getAttribute("data-state")).toBe("declare");
    expect(el.querySelector("[data-testid=attestation-fact]")?.getAttribute("data-hash")).toBe("ffff0000");
    expect(el.querySelector("[data-testid=attestation-amount]")?.textContent).toMatch(/200/);
    expect(el.querySelector("[data-testid=attestation-message]")?.textContent).toContain("a changé depuis votre lecture");
  });

  it("dit clairement qu'un lien n'est plus valide", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(404, { error: "Lien d'attestation invalide" }));
    const el = await mount();
    expect(el.querySelector("[data-testid=attestation-page]")?.getAttribute("data-attestation-state")).toBe("error");
    expect(el.querySelector("[data-testid=attestation-error]")?.textContent).toBe("Lien d'attestation invalide");
  });
});
