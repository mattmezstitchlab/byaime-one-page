// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * Le Oneboarding à l'articulation store ↔ serveur, comme dans l'aperçu local.
 *
 * Les tests de flux (`oneboarding-flow.test.tsx`) mockent le store : ils ne
 * voient pas les erreurs qui naissent quand le VRAI `ProjectProvider` parle au
 * VRAI schéma du serveur. Ce fichier les verrouille — c'est le filet de la
 * première version du Oneboarding, celle qui mène un projet mariage :
 *
 *  1. parcours couple : créer son mariage — les cinq étapes, sans erreur ;
 *  2. parcours invité : rejoindre un mariage — au moment du choix, plus de
 *     panneau « Vous rejoignez : Votre mariage » prématuré, ni d'erreur
 *     « Non enregistré » quand rien n'a encore été choisi ;
 *  3. les rôles se choisissent dans un menu dépliant : plus de bloc vertical
 *     de cases, et la sélection reste visible sans rouvrir la liste.
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

import { I18nProvider } from "@/lib/i18n";
import { Router } from "wouter";
import { ProjectProvider } from "@/store/project-store";
import { Oneboarding } from "./Oneboarding";
import {
  assignmentErrors,
  cardSchema,
  participationSchema,
  profileInputSchema,
  projectWithCards,
} from "../../../../api-server/src/lib/universalCard";
import {
  stripCardProjection,
  type Participation,
  type ProfessionalFunctioning,
  type UniversalCard,
} from "@workspace/aime-domain";

type Row = { id: string; title: string; data: unknown; updatedAt: string };
type ProfileRow = {
  id: string;
  cardUserId: string;
  profession: string;
  data: ProfessionalFunctioning;
  updatedAt: string;
};

let rows: Map<string, Row>;
let card: { userId: string; data: UniversalCard; updatedAt: string } | null;
let participations: Map<string, Participation>;
let profiles: Map<string, ProfileRow>;
let calls: string[];

const now = () => new Date().toISOString();
const projected = (row: Row) => ({
  ...row,
  role: "owner",
  data: projectWithCards(
    row.data,
    card && participations.has(row.id)
      ? [
          {
            userId: "user_test",
            card: card.data,
            profiles: [...profiles.values()],
            participation: participations.get(row.id) as Participation,
          },
        ]
      : [],
  ),
});

/** L'API simulée de l'aperçu local, avec les VRAIS schémas du serveur. */
vi.stubGlobal(
  "fetch",
  vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const path = url.startsWith("/api") ? url.slice(4) : url;
    const method = (init?.method ?? "GET").toUpperCase();
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, any>) : {};
    calls.push(`${method} ${url}`);
    const send = (status: number, payload?: unknown) =>
      new Response(payload === undefined ? "" : JSON.stringify(payload), {
        status,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    try {
      if (path === "/me/card") {
        if (method === "GET") return send(200, card);
        if (method === "PUT") {
          const parsed = cardSchema.safeParse(body.data);
          if (!parsed.success) return send(400, { error: "Carte invalide" });
          if ((card?.updatedAt ?? null) !== body.updatedAt)
            return send(409, { error: "Conflit de version" });
          card = { userId: "user_test", data: parsed.data, updatedAt: now() };
          return send(200, card);
        }
      }
      if (path === "/me/professional-profiles") {
        if (method === "GET") return send(200, [...profiles.values()]);
        if (method === "PUT") {
          const parsed = profileInputSchema.safeParse(body);
          if (!parsed.success || !card) return send(400, { error: "Profil métier invalide" });
          const input = parsed.data;
          const existing = profiles.get(input.profession);
          if ((existing?.updatedAt ?? null) !== input.updatedAt)
            return send(409, { error: "Conflit de version" });
          const row: ProfileRow = {
            id: existing?.id ?? crypto.randomUUID(),
            cardUserId: "user_test",
            profession: input.profession,
            data: input.data,
            updatedAt: now(),
          };
          profiles.set(row.profession, row);
          return send(200, row);
        }
      }
      const contextMatch = path.match(/^\/projects\/([^/]+)\/my-participation$/);
      if (contextMatch) {
        const id = contextMatch[1];
        if (!rows.has(id)) return send(404, { error: "Mariage introuvable" });
        if (method === "GET") return send(200, participations.get(id) ?? null);
        if (method === "PUT") {
          const parsed = participationSchema.safeParse(body);
          if (!card || !parsed.success)
            return send(400, {
              error: `Participation invalide : ${JSON.stringify(
                parsed.success ? [] : parsed.error.issues,
              )}`,
            });
          const issues = assignmentErrors(
            "user_test",
            parsed.data.roles,
            parsed.data.assignments ?? [],
            [...profiles.values()],
            ((rows.get(id)?.data as any)?.timeline ?? []) as { id: string; time: number }[],
            parsed.data,
          );
          if (issues.length) return send(422, { error: issues.join(" · ") });
          participations.set(id, parsed.data);
          return send(200, parsed.data);
        }
      }
      if (path === "/projects" && method === "GET")
        return send(200, [...rows.values()].map(projected));
      if (path === "/projects" && method === "POST") {
        const id = crypto.randomUUID();
        const row: Row = {
          id,
          title: (body.title as string) ?? "Notre mariage",
          data: { ...stripCardProjection((body.data ?? {}) as Record<string, unknown>), id },
          updatedAt: now(),
        };
        rows.set(id, row);
        return send(201, projected(row));
      }
      const projectMatch = path.match(/^\/projects\/([^/]+)$/);
      if (projectMatch && method === "GET") {
        const row = rows.get(projectMatch[1]);
        return row
          ? send(200, projected(row))
          : send(404, { error: "Monde introuvable (aperçu local)" });
      }
      if (projectMatch && (method === "PUT" || method === "PATCH" || method === "POST")) {
        const id = projectMatch[1];
        const row: Row = {
          id,
          title: (body.title as string) ?? rows.get(id)?.title ?? "Notre mariage",
          data: { ...stripCardProjection((body.data ?? {}) as Record<string, unknown>), id },
          updatedAt: now(),
        };
        rows.set(id, row);
        return send(200, projected(row));
      }
      if (path.match(/^\/projects\/[^/]+\/rsvp-links$/) && method === "GET")
        return send(200, []);
      return send(404, { error: `Endpoint non simulé dans l’aperçu local : ${method} ${path}` });
    } catch (e) {
      return send(500, { error: `API simulée en erreur : ${e}` });
    }
  }),
);

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <I18nProvider initialLocale="fr">
        <ProjectProvider>
          <Router>
            <Oneboarding signedIn />
          </Router>
        </ProjectProvider>
      </I18nProvider>,
    );
  });
  await settle(20);
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

const submit = () => click(byTestId("oneboarding-submit"));

/** Ouvre un menu dépliant par son préfixe (s'il est fermé), puis coche l'option.
 * Le menu reste ouvert après un choix (multi-choix) : d'où le garde-fou. */
async function pickInDropdown(prefix: string, option: string) {
  if (!byTestId(`${prefix}-panel`)) await click(byTestId(`${prefix}-trigger`));
  const panel = byTestId(`${prefix}-panel`);
  expect(panel, `panneau ${prefix} absent`).not.toBeNull();
  const optionEl = byTestId(`${prefix}-option-${option}`);
  expect(optionEl, `option ${option} absente`).not.toBeNull();
  const checkbox = optionEl!.querySelector("input[type=checkbox]") as HTMLInputElement;
  await act(async () => {
    checkbox.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await settle();
}

/** Décoche une sélection par sa pastille (sans rouvrir le menu). */
async function removeChip(prefix: string, option: string) {
  await click(byTestId(`${prefix}-remove-${option}`));
}

/** Dépose un mariage dans le catalogue, comme un mariage déjà ouvert. */
function seedWedding(id: string, label: string) {
  rows.set(id, {
    id,
    title: label,
    data: {
      schemaVersion: 2,
      title: label,
      universe: "Mariage",
      persona: "couple",
      timeline: [],
    },
    updatedAt: now(),
  });
}

beforeEach(() => {
  rows = new Map();
  card = null;
  participations = new Map();
  profiles = new Map();
  calls = [];
  window.sessionStorage.clear();
  window.localStorage.clear();
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

/** La carte, deux étapes plus loin : personne → rôle → mariage. */
async function reachWeddingStep(role: string) {
  await click(byTestId("landing-create-primary"));
  setValue(label("Prénom") as HTMLInputElement, "Camille");
  setValue(label("Nom") as HTMLInputElement, "Martin");
  await submit();
  expect(byTestId("oneboarding-step-role")).not.toBeNull();
  await pickInDropdown("role-picker", role);
  await submit();
  expect(byTestId("oneboarding-step-wedding")).not.toBeNull();
}

describe("couple : créer son mariage (l'erreur vécue)", () => {
  it("parcourt les cinq étapes, la création attend le serveur", async () => {
    await mount();
    await reachWeddingStep("Mariée");

    /* La porte du mariage : « créer » est suggérée pour un couple. */
    expect(text()).toContain("Que souhaitez-vous faire ?");
    expect(byTestId("oneboarding-wedding-create")!.getAttribute("aria-pressed")).toBe("true");

    await click(byTestId("oneboarding-wedding-create"));
    expect(byTestId("oneboarding-wedding-join")).toBeNull();
    setValue(label("Quand a lieu le mariage") as HTMLInputElement, "12 septembre 2026");
    setValue(label("Où aura-t-il lieu") as HTMLInputElement, "Lille");
    /* L'aperçu lit les réponses, sans rien inventer. */
    expect(text()).toContain("Notre mariage");

    /* Le service refuse : on reste sur la même étape, réponses intactes. */
    rows = new Map();
    (fetch as any).mockImplementationOnce(async () =>
      new Response(JSON.stringify({ error: "Le service n’a pas pu répondre." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await submit();
    expect(byTestId("oneboarding-step-wedding")).not.toBeNull();
    expect((label("Quand a lieu le mariage") as HTMLInputElement).value).toBe(
      "12 septembre 2026",
    );

    /* Puis le service répond : création → participation → étape suivante. */
    await submit();
    expect(calls.some((c) => c === "POST /api/projects")).toBe(true);
    expect(
      calls.some((c) => c.startsWith("PUT /api/projects/") && c.endsWith("/my-participation")),
    ).toBe(true);
    expect(byTestId("oneboarding-step-organize")).not.toBeNull();

    /* Au retour sur l'étape mariage : « ouvert », jamais « vous rejoignez ». */
    await click(byTestId("oneboarding-back"));
    await settle();
    const selected = byTestId("oneboarding-wedding-selected");
    expect(selected).not.toBeNull();
    expect(selected!.textContent).toContain("Votre mariage est ouvert :");
    expect(selected!.textContent).not.toContain("Vous rejoignez :");
    /* Et le formulaire de création n'est pas redéroulé à côté. */
    expect(label("Quand a lieu le mariage")).toBeNull();
  });
});

describe("invité : rejoindre un mariage", () => {
  it("au moment du choix, ni panneau prématuré ni « Non enregistré »", async () => {
    await mount();
    await reachWeddingStep("Invité");

    await click(byTestId("oneboarding-wedding-join"));
    /* Le choix du mariage : liste ou invitation — et RIEN d'autre. */
    expect(byTestId("oneboarding-wedding-join-choice")).not.toBeNull();
    expect(byTestId("oneboarding-wedding-selected")).toBeNull();
    expect(text()).not.toContain("Vous rejoignez :");

    /* Continuer sans avoir choisi : une indication en ligne, pas une
       persistance « Non enregistré ». */
    await submit();
    expect(byTestId("save-notice")?.getAttribute("data-save-state")).not.toBe("failure");
    expect(text()).toContain("Choisissez le mariage que vous rejoignez");
    expect(byTestId("oneboarding-step-wedding")).not.toBeNull();
  });

  it("choisit un mariage déjà ouvert, et la participation part au serveur", async () => {
    seedWedding("11111111-1111-4111-8111-111111111111", "Claire & Thomas");
    await mount();
    await reachWeddingStep("Invité");
    await click(byTestId("oneboarding-wedding-join"));

    const select = byTestId("oneboarding-wedding-join-select") as HTMLSelectElement;
    expect(select).not.toBeNull();
    setValue(select, "11111111-1111-4111-8111-111111111111");
    await settle();
    /* Le mariage choisi est nommé — le panneau apparaît, avec le bon verbe. */
    const selected = byTestId("oneboarding-wedding-selected")! as HTMLElement;
    expect(selected).not.toBeNull();
    expect(selected.textContent).toContain("Vous rejoignez :");
    expect(selected.textContent).toContain("Claire & Thomas");

    await submit();
    expect(
      calls.some((c) => c === "PUT /api/projects/11111111-1111-4111-8111-111111111111/my-participation"),
    ).toBe(true);
    expect(byTestId("oneboarding-step-presence")).not.toBeNull();
  });
});

describe("le rôle, en menu dépliant", () => {
  it("plus de bloc de cases : un bouton, un panneau, une sélection visible", async () => {
    await mount();
    await click(byTestId("landing-create-primary"));
    setValue(label("Prénom") as HTMLInputElement, "Camille");
    setValue(label("Nom") as HTMLInputElement, "Martin");
    await submit();
    expect(byTestId("oneboarding-step-role")).not.toBeNull();

    /* Fermé : aucune case n'est dépliée. Le choix passe par le bouton. */
    const rolePicker = byTestId("oneboarding-role-picker")!;
    expect(rolePicker.querySelectorAll("input[type=checkbox]").length).toBe(0);
    expect(byTestId("role-picker-trigger")).not.toBeNull();

    /* Ouvert : la liste groupée, avec recherche. */
    await pickInDropdown("role-picker", "Mariée");
    /* La sélection est visible sur la pastille, sans rouvrir le menu. */
    const selected = byTestId("role-picker-selected")!;
    expect(selected.textContent).toContain("Mariée");
    expect(byTestId("role-picker-remove-Mariée")).not.toBeNull();

    /* Retirer par la pastille, sans rouvrir le menu. */
    await removeChip("role-picker", "Mariée");
    expect(byTestId("role-picker-selected")).toBeNull();

    /* Le panneau est resté ouvert pendant le multi-choix : on le referme. */
    await click(byTestId("role-picker-trigger"));
    expect(byTestId("role-picker-panel")).toBeNull();

    /* Rouvert : recherche dans le panneau. */
    await click(byTestId("role-picker-trigger"));
    const search = byTestId("role-picker-search") as HTMLInputElement;
    setValue(search, "saxo");
    await settle();
    expect(byTestId("role-picker-option-Saxophoniste")).not.toBeNull();
    expect(byTestId("role-picker-option-Photographe")).toBeNull();
  });

  it("une activité propose le rôle pour ce mariage — à confirmer, jamais imposé", async () => {
    await mount();
    await click(byTestId("landing-create-primary"));
    setValue(label("Prénom") as HTMLInputElement, "Camille");
    setValue(label("Nom") as HTMLInputElement, "Martin");
    await submit();

    await pickInDropdown("activities-picker", "Saxophoniste");
    /* La proposition est affichée, et le rôle est pré-coché. */
    const proposal = byTestId("oneboarding-role-proposal")!;
    expect(proposal).not.toBeNull();
    expect(proposal.textContent).toContain("Saxophoniste");
    expect(byTestId("role-picker-selected")!.textContent).toContain("Saxophoniste");

    /* Décocher l'activité retire la proposition — et le rôle pré-coché.
       Le panneau est resté ouvert pendant le multi-choix : on y reste. */
    await pickInDropdown("activities-picker", "Saxophoniste");
    expect(byTestId("oneboarding-role-proposal")).toBeNull();
    expect(byTestId("role-picker-selected")).toBeNull();
  });
});
