// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttestationClaimPanel } from "./AttestationClaimPanel";
import { CountersignedMoments } from "./CountersignedMoments";

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
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); }); };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const TOKEN = "11111111-1111-1111-1111-111111111111";
const moment = { projectId: "w1", projectTitle: "Mariage de C & J", eventId: "bal", providerId: "sax", providerRole: "Saxophoniste", title: "Bal", time: Date.UTC(2026, 7, 1, 20), location: "Orangerie", amountCents: 15_000, state: "atteste" as const, attestedAt: "2026-09-18T10:00:00Z" };

async function mount(node: React.ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(node); });
  await flush();
  return container!;
}

describe("le rattachement des Moments attestés", () => {
  it("vérifie le lien d'emblée, montre les Moments, et ne rattache qu'après consentement explicite", async () => {
    const calls: Array<{ url: string; method: string; body?: unknown }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      calls.push({ url: String(input), method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined });
      return json(200, { projectId: "w1", projectTitle: "Mariage de C & J", providerRole: "Saxophoniste", moments: [moment, { ...moment, eventId: "repet", title: "Répétition", state: "declare" }], alreadyClaimed: false, confirmed: init?.method === "POST" });
    });
    const joined: string[] = [];
    const el = await mount(<AttestationClaimPanel initialToken={`https://byaime.fr/attestation/${TOKEN}`} onJoined={(id) => { joined.push(id); }} onClose={() => {}} />);

    expect(calls[0]).toMatchObject({ url: `/api/attestation/${TOKEN}/claim`, method: "GET" });
    expect(el.querySelectorAll("[data-testid=attestation-claim-moments] li")).toHaveLength(2);
    expect(el.textContent).toContain("Saxophoniste");
    const submit = el.querySelector<HTMLButtonElement>("[data-testid=attestation-claim-submit]")!;
    expect(submit.disabled).toBe(true);

    await act(async () => { el.querySelector<HTMLInputElement>("[data-testid=attestation-claim-confirm] input")!.click(); });
    expect(submit.disabled).toBe(false);
    await act(async () => { submit.click(); });
    await flush();
    expect(calls[1]).toMatchObject({ url: `/api/attestation/${TOKEN}/claim`, method: "POST", body: { confirmed: true } });
    expect(joined).toEqual(["w1"]);
  });

  it("refuse un lien qui n'est pas une attestation, sans appeler le serveur", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const el = await mount(<AttestationClaimPanel initialToken={`https://byaime.fr/rsvp/${TOKEN}`} onJoined={() => {}} onClose={() => {}} />);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(el.querySelector("[role=alert]")?.textContent).toContain("lien d'attestation");
  });

  it("nomme le refus du serveur tel quel : adresse non confirmée, pas de rattachement", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(403, { error: "Rattachement refusé. Faites confirmer par l'organisateur une adresse personnelle unique pour vous, et vérifiez cette adresse dans votre compte." }));
    const el = await mount(<AttestationClaimPanel initialToken={TOKEN.length ? `/attestation/${TOKEN}` : ""} onJoined={() => {}} onClose={() => {}} />);
    expect(el.querySelector("[data-testid=attestation-claim-review]")).toBeNull();
    expect(el.querySelector("[role=alert]")?.textContent).toContain("Faites confirmer par l'organisateur");
  });
});

describe("le Profil qui naît rempli", () => {
  it("montre ce que d'autres Mondes ont attesté, résumé en tête, périmés à part", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(200, {
      moments: [moment, { ...moment, projectId: "w2", projectTitle: "Bal de la mairie", eventId: "e2", title: "Concert", state: "perime" }],
      proof: { moments: 2, attested: 1, worlds: 1, amountCents: 15_000, since: moment.time },
    }));
    const el = await mount(<CountersignedMoments enabled onClaim={() => {}} />);
    expect(el.querySelector("[data-testid=countersigned-proof]")?.textContent).toMatch(/1 Moment attesté dans 1 Monde/);
    const items = [...el.querySelectorAll("[data-testid=countersigned-moment]")];
    expect(items.map(item => item.getAttribute("data-state"))).toEqual(["atteste", "perime"]);
    expect(items[0].textContent).toContain("Mariage de C & J");
    expect(items[1].textContent).toContain("le fait a changé");
  });

  it("reste une carte complète quand le service n'est pas là", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));
    const el = await mount(<CountersignedMoments enabled onClaim={() => {}} />);
    expect(el.querySelector("[data-testid=countersigned-moments]")).not.toBeNull();
    expect(el.textContent).toContain("n'a pas à se raconter");
  });
});
