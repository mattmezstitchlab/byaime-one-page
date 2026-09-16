// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * Le Oneboarding, monté pour de vrai : cinq étapes, traversées.
 *
 * Ce fichier verrouille ce que l'audit avait trouvé cassé :
 *  1. une seule porte d'entrée, puis toujours « Question X sur 5 » ;
 *  2. le tunnel dépend du rôle, mais le repère ne bouge jamais ;
 *  3. une écriture qui échoue bloque l'étape — on ne navigue jamais vers un
 *     mariage qui n'existe pas côté serveur ;
 *  4. ce que BYAIME sait déjà est montré, pas redemandé.
 */

vi.mock("@clerk/react", () => {
  const passthrough = ({ children }: { children?: ReactNode }) => children ?? null;
  return {
    ClerkProvider: passthrough,
    Show: ({ when, children }: { when: string; children?: ReactNode }) =>
      when === "signed-in" ? (children ?? null) : null,
    SignIn: () => null,
    SignUp: () => null,
    useAuth: () => ({ isLoaded: true, isSignedIn: true, userId: "user_test" }),
    useUser: () => ({ isLoaded: true, isSignedIn: true, user: { id: "user_test" } }),
    useSession: () => ({ isLoaded: true, session: null }),
    useClerk: () => ({ addListener: () => () => {}, signOut: async () => {} }),
  };
});
vi.mock("@clerk/react/internal", () => ({
  publishableKeyFromHost: (_host: string, key?: string) => key,
}));

const store = vi.hoisted(() => ({
  projects: [] as { id: string; title: string; displayLabel?: string; role?: string }[],
  project: null as any,
  createProjectOnServer: vi.fn(),
  selectProject: vi.fn(async () => true),
  navigated: [] as string[],
}));

vi.mock("@/store/project-store", () => ({
  useProject: () => ({
    projects: store.projects,
    project: store.project,
    selectProject: store.selectProject,
    createProjectOnServer: store.createProjectOnServer,
    syncStatus: "saved",
  }),
}));

vi.mock("wouter", async () => {
  const actual = await vi.importActual<typeof import("wouter")>("wouter");
  return {
    ...actual,
    useLocation: () => ["/", (to: string) => store.navigated.push(to)] as const,
  };
});

import { I18nProvider } from "@/lib/i18n";
import { Router } from "wouter";
import { Oneboarding } from "./Oneboarding";

const WEDDING = { id: "11111111-1111-4111-8111-111111111111", title: "Notre Mariage", displayLabel: "Claire & Thomas · 12 sept. 2026 · Lille", role: "owner" };

type Route = (method: string, url: string, body: unknown) => { status?: number; json?: unknown };

let routes: Route[] = [];
let calls: { method: string; url: string; body: unknown }[] = [];

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const savedCard = {
  userId: "user_test",
  updatedAt: "2026-09-15T10:00:00.000Z",
  data: {
    firstName: "Matthieu",
    lastName: "Renard",
    nickname: "",
    city: "Lille",
    profession: "Photographe",
    photoUrl: "",
    interests: ["Jazz"],
  },
};

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

async function mount(signedIn = true) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <I18nProvider initialLocale="fr">
        <Router>
          <Oneboarding signedIn={signedIn} />
        </Router>
      </I18nProvider>,
    );
  });
  await settle();
}

async function settle(times = 12) {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
}

const byTestId = (id: string) => container!.querySelector(`[data-testid="${id}"]`);
const text = () => container!.textContent ?? "";

async function click(el: Element | null) {
  if (!el) throw new Error("élément absent au clic");
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await settle();
}

function setValue(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto =
    input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : input instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

const label = (name: string) => {
  const found = Array.from(container!.querySelectorAll("label")).find((l) =>
    l.textContent?.trim().startsWith(name),
  );
  return (found?.querySelector("input, select, textarea") ?? null) as HTMLElement | null;
};

/** Coche une case par son libellé, dans la liste demandée (`role` ou `activité`). */
const checkLabelled = async (name: string, occurrence: number) => {
  const boxes = Array.from(container!.querySelectorAll("label"))
    .filter((l) => l.textContent?.trim() === name)
    .map((l) => l.querySelector("input[type=checkbox]") as HTMLInputElement | null)
    .filter((b): b is HTMLInputElement => Boolean(b));
  const box = boxes[occurrence];
  if (!box) throw new Error(`case introuvable : ${name} (#${occurrence})`);
  await act(async () => {
    box.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await settle();
};
const labelled = (name: string, occurrence: number): HTMLInputElement => {
  const boxes = Array.from(container!.querySelectorAll("label"))
    .filter((l) => l.textContent?.trim() === name)
    .map((l) => l.querySelector("input[type=checkbox]") as HTMLInputElement | null)
    .filter((b): b is HTMLInputElement => Boolean(b));
  const box = boxes[occurrence];
  if (!box) throw new Error(`case introuvable : ${name} (#${occurrence})`);
  return box;
};
/** Le rôle dans ce mariage est listé en premier, l'activité personnelle ensuite. */
const checkRole = (role: string) => checkLabelled(role, 0);
const checkActivity = (activity: string) => checkLabelled(activity, 1);

const stepNumber = () => byTestId("oneboarding")?.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow");
const submit = () => click(byTestId("oneboarding-submit"));
const saveNotice = () => byTestId("save-notice");

beforeEach(() => {
  routes = [];
  calls = [];
  store.projects = [{ ...WEDDING }];
  store.project = null;
  store.navigated = [];
  store.selectProject.mockClear();
  store.createProjectOnServer.mockReset();
  window.sessionStorage.clear();
  window.localStorage.clear();

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: any, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method, url, body });
      for (const route of routes) {
        const matched = route(method, url, body);
        if (matched) return jsonResponse(matched.json ?? null, matched.status ?? 200);
      }
      return jsonResponse(null, 404);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

/** Le service de la carte : panne 5xx, ou réponse normale. */
function cardService(mode: "down" | "empty" | "saved") {
  routes.push((method, url, body) => {
    if (!url.includes("/api/me/card")) return null as any;
    if (method === "GET") {
      if (mode === "down") return { status: 500, json: { error: "Le service n’a pas pu répondre. Réessayez dans un instant." } };
      return { json: mode === "saved" ? savedCard : null };
    }
    if (mode === "down") return { status: 500, json: { error: "Le service n’a pas pu répondre. Réessayez dans un instant." } };
    return { json: { ...savedCard, data: (body as any).data, updatedAt: "2026-09-16T10:00:00.000Z" } };
  });
  routes.push((method, url, body) => {
    if (!url.includes("/api/me/professional-profiles")) return null as any;
    if (method === "GET") return { json: [] };
    return {
      json: {
        id: `prof-${(body as any).profession}`,
        cardUserId: "user_test",
        profession: (body as any).profession,
        data: (body as any).data,
        updatedAt: "2026-09-16T10:00:00.000Z",
      },
    };
  });
  routes.push((method, url, body) => {
    if (!url.includes("/my-participation")) return null as any;
    if (method === "GET") return { json: null };
    return { json: body };
  });
}

async function startFlow() {
  await click(byTestId("landing-create-primary"));
}

describe("une seule porte, puis cinq étapes", () => {
  it("n'offre qu'une action, et commence toujours par la personne", async () => {
    cardService("empty");
    await mount();

    expect(text()).toContain("Votre carte BYAIME");
    expect(text()).toContain("Votre identité. Une seule fois.");
    expect(byTestId("landing-create-primary")?.textContent).toContain("Créer ma carte");
    /* Ni « Créer un mariage », ni « Voir ma carte », ni « Outils avancés ». */
    expect(text()).not.toContain("Créer un mariage");
    expect(text()).not.toContain("Outils avancés");

    await startFlow();
    expect(byTestId("oneboarding-step-person")).not.toBeNull();
    expect(stepNumber()).toBe("1");
    expect(byTestId("oneboarding")?.querySelector('[role="progressbar"]')?.getAttribute("aria-valuemax")).toBe("5");
    /* Le mariage n'est pas créé à cette étape. */
    expect(store.createProjectOnServer).not.toHaveBeenCalled();
  });

  it("une personne déjà inscrite voit « Ma carte », et son étape 1 en lecture seule", async () => {
    cardService("saved");
    await mount();

    expect(byTestId("landing-create-primary")?.textContent).toContain("Ma carte");

    await startFlow();
    expect(stepNumber()).toBe("1");
    expect(byTestId("step-flow-known")).not.toBeNull();
    /* Déjà connu : montré, pas redemandé. */
    expect(text()).toContain("Matthieu Renard");
    expect(label("Prénom")).toBeNull();
    expect(byTestId("known-summary-edit")).not.toBeNull();

    await click(byTestId("known-summary-edit"));
    expect(label("Prénom")).not.toBeNull();
  });
});

describe("le contrat de sauvegarde", () => {
  it("dit « Enregistré » quand le service a répondu, et avance", async () => {
    cardService("empty");
    await mount();
    await startFlow();

    setValue(label("Prénom") as HTMLInputElement, "Camille");
    setValue(label("Nom") as HTMLInputElement, "Martin");
    await submit();

    expect(calls.some((c) => c.method === "PUT" && c.url.includes("/api/me/card")), "la carte n'a pas été envoyée").toBe(true);
    expect(saveNotice()?.getAttribute("data-save-state")).toBe("saved");
    expect(text()).toContain("Votre carte est enregistrée.");
    expect(stepNumber()).toBe("2");
  });

  it("un service en panne bloque l'étape, garde la saisie, et propose Réessayer", async () => {
    cardService("down");
    await mount();
    await startFlow();

    setValue(label("Prénom") as HTMLInputElement, "Camille");
    setValue(label("Nom") as HTMLInputElement, "Martin");
    await submit();

    /* Le message du serveur est repris tel quel — c'est lui qui connaît l'état. */
    expect(saveNotice()?.getAttribute("data-save-state")).toBe("failure");
    expect(text()).toContain("n’a pas pu répondre");
    expect(byTestId("save-notice-retry")).not.toBeNull();
    /* Aucune réussite feinte, et surtout : on n'avance pas. */
    expect(text()).not.toContain("Votre carte est enregistrée.");
    expect(stepNumber()).toBe("1");
    expect((label("Prénom") as HTMLInputElement).value).toBe("Camille");

    /* Réessayer ne perd rien et peut aboutir. */
    routes = routes.filter(() => true);
    routes[0] = (method, url, body) => {
      if (!url.includes("/api/me/card")) return null as any;
      if (method === "GET") return { json: null };
      return { json: { ...savedCard, data: (body as any).data, updatedAt: "2026-09-16T10:00:00.000Z" } };
    };
    await click(byTestId("save-notice-retry"));
    expect(saveNotice()?.getAttribute("data-save-state")).toBe("saved");
    expect(stepNumber()).toBe("2");
  });

  it("sans compte, c'est un brouillon local — et jamais « enregistré »", async () => {
    cardService("empty");
    await mount(false);
    await startFlow();

    setValue(label("Prénom") as HTMLInputElement, "Camille");
    setValue(label("Nom") as HTMLInputElement, "Martin");
    await submit();

    expect(calls.some((c) => c.url.includes("/api/me/card")), "aucun appel serveur attendu").toBe(false);
    expect(saveNotice()?.getAttribute("data-save-state")).toBe("draft");
    expect(text()).toContain("conservées pendant cette étape");
    expect(text()).not.toContain("Votre carte est enregistrée.");
    expect(window.sessionStorage.getItem("aime-personal-card-draft-v1")).toContain("Camille");
    expect(stepNumber()).toBe("2");
  });
});

describe("le tunnel suit le rôle, le repère ne bouge pas", () => {
  async function reachRoleStep() {
    cardService("empty");
    await mount();
    await startFlow();
    setValue(label("Prénom") as HTMLInputElement, "Camille");
    setValue(label("Nom") as HTMLInputElement, "Martin");
    await submit();
    expect(stepNumber()).toBe("2");
  }

  it("invité : le mariage, puis la présence", async () => {
    await reachRoleStep();
    await checkRole("Invité");
    await submit();

    /* Aucune activité : pas d'étape de fonctionnement inventée. */
    expect(stepNumber()).toBe("3");
    expect(byTestId("oneboarding-step-wedding")).not.toBeNull();
    expect(byTestId("oneboarding-wedding-join")).not.toBeNull();

    await click(byTestId("oneboarding-wedding-join"));
    setValue(byTestId("oneboarding-step-wedding")!.querySelector("select") as HTMLSelectElement, WEDDING.id);
    await settle();
    await submit();

    expect(stepNumber()).toBe("4");
    expect(byTestId("oneboarding-step-presence")).not.toBeNull();
    await submit();
    expect(stepNumber()).toBe("5");
    expect(byTestId("oneboarding-step-confirm")).not.toBeNull();
    expect(text()).toContain("Ma Timeline est prête");
  });

  it("wedding planner : le fonctionnement, puis créer le mariage du client", async () => {
    await reachRoleStep();
    await checkRole("Wedding planner");
    await checkActivity("Wedding planner");
    await submit();

    /* Comme un professionnel : son fonctionnement passe avant le mariage. */
    expect(stepNumber()).toBe("3");
    expect(byTestId("oneboarding-step-functioning")).not.toBeNull();
    await submit();

    /* Mais c'est lui qui ouvre le Monde : « créer » est suggéré, pas « rejoindre ».
       Les deux portes restent ouvertes — la suggestion ne contraint pas. */
    expect(stepNumber()).toBe("4");
    expect(byTestId("oneboarding-step-wedding")).not.toBeNull();
    expect(text()).toContain("créiez un mariage");
    expect(byTestId("oneboarding-wedding-create")!.getAttribute("aria-pressed")).toBe("true");
    expect(byTestId("oneboarding-wedding-join")!.getAttribute("aria-pressed")).toBe("false");
    /* L'autre option n'est jamais retirée. */
    expect(byTestId("oneboarding-wedding-join")).not.toBeNull();
  });

  it("sans rôle dit : le parcours invité sert de repli, rien n'est bloqué", async () => {
    await reachRoleStep();
    /* Aucune case cochée : BYAIME ne devine pas un rôle à la place de la personne. */
    await submit();

    expect(stepNumber()).toBe("3");
    expect(byTestId("oneboarding-step-wedding")).not.toBeNull();
    /* Un inconnu rejoint un mariage plus souvent qu'il n'en ouvre un. */
    expect(text()).toContain("rejoigniez un mariage");
    expect(byTestId("oneboarding-wedding-join")!.getAttribute("aria-pressed")).toBe("true");

    await click(byTestId("oneboarding-wedding-join"));
    setValue(
      byTestId("oneboarding-step-wedding")!.querySelector("select") as HTMLSelectElement,
      WEDDING.id,
    );
    await settle();
    await submit();

    /* Le repli est le tunnel invité : mariage, présence, confirmation. */
    expect(stepNumber()).toBe("4");
    expect(byTestId("oneboarding-step-presence")).not.toBeNull();
    await submit();
    expect(stepNumber()).toBe("5");
    expect(byTestId("oneboarding-step-confirm")).not.toBeNull();

    /*
     * Sans rôle, le récapitulatif ne doit ni afficher une ligne vide ni laisser
     * un blanc : KnownSummary filtre les lignes vides. Le mariage, lui, est bien
     * nommé — c'est la seule information de ce mariage qui existe.
     */
    const summary = byTestId("oneboarding-summary")!;
    expect(summary.textContent).toContain("Ce mariage");
    /* Le mariage est nommé par son libellé lisible, pas par son titre brut. */
    expect(summary.textContent).toContain(WEDDING.displayLabel!);
    const lines = Array.from(summary.querySelectorAll("dl div"));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line.textContent!.trim().length).toBeGreaterThan(0);
  });

  it("photographe : le fonctionnement arrive avant le mariage", async () => {
    await reachRoleStep();
    /* Le rôle pour ce mariage, puis l'activité sur la carte : deux choix
       distincts, même quand ils portent le même nom. */
    await checkRole("Photographe");
    await checkActivity("Photographe");
    await submit();

    expect(stepNumber()).toBe("3");
    expect(byTestId("oneboarding-step-functioning")).not.toBeNull();
    expect(text()).toContain("Photographe");
    expect(text()).toContain("Durée habituelle (minutes)");
  });

  it("une activité propose le rôle pour ce mariage — à confirmer, jamais imposé", async () => {
    await reachRoleStep();

    /* Cocher l'activité pré-coche le rôle : une seule saisie, pas deux. */
    await checkActivity("Saxophoniste");
    const proposal = byTestId("oneboarding-role-proposal");
    expect(proposal).not.toBeNull();
    expect(proposal!.textContent).toContain("Saxophoniste");
    /* La proposition nomme ce mariage, jamais tous les mariages. */
    expect(proposal!.textContent).toContain("ce mariage");
    const roleBox = labelled("Saxophoniste", 0);
    expect(roleBox.checked).toBe(true);

    /* La personne reste libre : décocher le rôle ne retire pas l'activité. */
    await checkRole("Saxophoniste");
    expect(labelled("Saxophoniste", 0).checked).toBe(false);
    expect(labelled("Saxophoniste", 1).checked).toBe(true);
  });

  it("n’affiche aucun concept technique, à aucune étape", async () => {
    /*
     * La contrainte porte sur tout ce que la personne voit, pas seulement sur
     * les titres d'étapes : ni Universal Card, ni Membership, ni Participation,
     * ni Assignment, ni Projection, ni Contexte. Le vocabulaire autorisé est
     * Moi / Mon activité / Mon mariage / Ma présence / Ma Timeline.
     */
    const forbidden = [
      "Universal Card",
      "Membership",
      "Projection",
      "Assignment",
      "Contexte",
      "Participation",
      "Carte universelle",
    ];
    const seen: string[] = [];

    await reachRoleStep();
    seen.push(text());
    await checkRole("Photographe");
    await checkActivity("Photographe");
    await submit();
    seen.push(text()); // fonctionnement
    await submit();
    seen.push(text()); // mariage
    await click(byTestId("oneboarding-wedding-join"));
    setValue(
      byTestId("oneboarding-step-wedding")!.querySelector("select") as HTMLSelectElement,
      WEDDING.id,
    );
    await settle();
    await submit();
    seen.push(text()); // confirmation

    /* On a bien traversé plusieurs étapes, sinon le test ne prouve rien. */
    expect(seen.length).toBe(4);
    for (const screen of seen) {
      for (const term of forbidden) expect(screen).not.toContain(term);
    }
  });

  it("deux activités : chaque métier a ses propres paramètres", async () => {
    await reachRoleStep();
    await checkRole("Photographe");
    await checkRole("Saxophoniste");
    /* Les activités sont choisies séparément des rôles de ce mariage. */
    const activityBoxes = Array.from(container!.querySelectorAll("label")).filter((l) =>
      ["Photographe", "Saxophoniste"].includes(l.textContent?.trim() ?? ""),
    );
    for (const box of activityBoxes) {
      const input = box.querySelector("input[type=checkbox]") as HTMLInputElement;
      if (!input.checked) {
        await act(async () => {
          input.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        });
      }
    }
    await settle();
    await submit();

    expect(byTestId("oneboarding-step-functioning")).not.toBeNull();
    /* Un bloc par activité — pas un « métier » unique. */
    expect(text()).toContain("Durée habituelle (minutes)");
    expect(text()).toContain("Soundcheck (minutes)");
    expect(text()).toContain("Nombre de sets");
  });
});

describe("créer un mariage", () => {
  it("attend la confirmation du serveur avant d'avancer", async () => {
    cardService("empty");
    await mount();
    await startFlow();
    setValue(label("Prénom") as HTMLInputElement, "Claire");
    setValue(label("Nom") as HTMLInputElement, "Thomas");
    await submit();
    await checkRole("Mariée");
    await submit();

    expect(byTestId("oneboarding-step-wedding")).not.toBeNull();
    await click(byTestId("oneboarding-wedding-create"));
    setValue(label("Quand a lieu le mariage ?") as HTMLInputElement, "12 septembre 2026");

    /* Le service refuse : rien ne bouge. */
    store.createProjectOnServer.mockResolvedValueOnce({ ok: false, error: "Le service n’a pas pu répondre. Réessayez dans un instant." });
    await submit();
    expect(saveNotice()?.getAttribute("data-save-state")).toBe("failure");
    expect(stepNumber()).toBe("3");
    expect(store.navigated).toEqual([]);
    /* Les réponses saisies restent intactes. */
    expect((label("Quand a lieu le mariage ?") as HTMLInputElement).value).toBe("12 septembre 2026");

    /* Puis il accepte : la création est attendue avant l'étape suivante. */
    store.createProjectOnServer.mockResolvedValueOnce({ ok: true, id: "22222222-2222-4222-8222-222222222222", pendingServer: false });
    await click(byTestId("save-notice-retry"));
    expect(stepNumber()).toBe("4");
    /* La donnée structurée est passée au store — pas une phrase à reparser. */
    const draft = store.createProjectOnServer.mock.calls[0][0];
    expect(draft.universe).toBe("Mariage");
    /* Une information absente est déclarée absente, jamais inventée. */
    expect(draft.city).toEqual({ value: null, confidence: "manquant" });
    expect(new Date(draft.pivot.value).getFullYear()).toBe(2026);
    expect(store.navigated).toEqual([]);
  });
});
