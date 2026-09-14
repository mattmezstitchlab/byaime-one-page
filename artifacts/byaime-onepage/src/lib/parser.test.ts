import { describe, expect, it } from "vitest";
import { parseIntention, createInitialProject, parseDateFromText } from "./parser";
import { DEFAULT_HERO_VISUAL } from "./world-visuals";

/* Référence fixe : le jour courant ne doit plus jamais influencer la date lue. */
const NOW = new Date(2026, 8, 14, 10, 0, 0);
const parts = (value: number) => {
  const date = new Date(value);
  return { day: date.getDate(), month: date.getMonth(), year: date.getFullYear() };
};

describe("parseIntention — multilingue et multidevises", () => {
  it("reconnaît les mois et la ville en anglais", () => {
    const draft = parseIntention("Our wedding on August 14, 2027 near Austin, 120 guests, $25,000, intimate mood.");
    expect(draft.universe).toBe("Mariage");
    expect(new Date(draft.pivot!.value as number).getMonth()).toBe(7);
    expect(draft.city?.value).toMatch(/Austin/);
    expect(draft.guestsCount?.value).toBe(120);
    expect(draft.budget?.value).toBe(25000);
    expect(draft.currency).toBe("USD");
  });

  it("mappe chaque symbole de devise vers le bon code ISO", () => {
    expect(parseIntention("Notre mariage 10 000 €").currency).toBe("EUR");
    expect(parseIntention("Our wedding $10,000").currency).toBe("USD");
    expect(parseIntention("Our wedding C$10,000").currency).toBe("CAD");
    expect(parseIntention("Our wedding £10,000").currency).toBe("GBP");
    expect(parseIntention("Notre mariage 10 000 CHF").currency).toBe("CHF");
    expect(parseIntention("Notre mariage 100 000 MAD").currency).toBe("MAD");
  });
});

describe("createInitialProject — persona et devise", () => {
  it("hérite du persona pro et de la devise annoncés à l'onboarding", () => {
    const draft = parseIntention("Our wedding on August 14, 2027 near Austin, $25,000.");
    const project = createInitialProject(draft, "Our wedding …", { persona: "pro" });
    expect(project.persona).toBe("pro");
    expect(project.currency).toBe("USD");
  });

  it("retombe sur les valeurs par défaut couple / euro", () => {
    const project = createInitialProject({}, "Notre mariage.");
    expect(project.persona).toBe("couple");
    expect(project.currency).toBe("EUR");
  });
});

describe("parseDateFromText — la date de l'onboarding est réellement lue", () => {
  it("prend le jour en compte, pas seulement le mois et l'année", () => {
    expect(parts(parseDateFromText("Notre mariage le 5 août 2027", { now: NOW }).value)).toEqual({ day: 5, month: 7, year: 2027 });
    expect(parts(parseDateFromText("Notre mariage le 28 février 2028", { now: NOW }).value)).toEqual({ day: 28, month: 1, year: 2028 });
  });

  it("ne garde plus le quantième d'aujourd'hui quand seul le mois est donné", () => {
    const parsed = parseDateFromText("Notre mariage en août 2027", { now: NOW });
    expect(parts(parsed.value)).toEqual({ day: 1, month: 7, year: 2027 });
  });

  it("lit les dates numériques, jour/mois comme mois/jour", () => {
    expect(parts(parseDateFromText("Notre mariage le 14/08/2027", { now: NOW }).value)).toEqual({ day: 14, month: 7, year: 2027 });
    expect(parts(parseDateFromText("Notre mariage le 14.08.2027", { now: NOW }).value)).toEqual({ day: 14, month: 7, year: 2027 });
    expect(parts(parseDateFromText("Notre mariage le 2027-08-14", { now: NOW }).value)).toEqual({ day: 14, month: 7, year: 2027 });
    expect(parts(parseDateFromText("Notre mariage le 08/14/2027", { now: NOW }).value)).toEqual({ day: 14, month: 7, year: 2027 });
    expect(parts(parseDateFromText("Our wedding on 08/14/2027", { now: NOW, locale: "en" }).value)).toEqual({ day: 14, month: 7, year: 2027 });
  });

  it("lit la forme anglaise mois-jour-année", () => {
    expect(parts(parseDateFromText("Our wedding on August 14, 2027", { now: NOW }).value)).toEqual({ day: 14, month: 7, year: 2027 });
  });

  it("ne déborde pas sur le mois suivant quand le mois visé est plus court", () => {
    /* Le 14 septembre posé sur un 31 du mois courant basculait en octobre. */
    const pinned = new Date(2026, 8, 30, 10);
    expect(parts(parseDateFromText("Notre mariage le 31 janvier 2027", { now: pinned }).value)).toEqual({ day: 31, month: 0, year: 2027 });
    expect(parts(parseDateFromText("Notre mariage en février 2027", { now: pinned }).value)).toEqual({ day: 1, month: 1, year: 2027 });
  });

  it("dit ce qui a été trouvé, et retombe sur l'an prochain sinon", () => {
    expect(parseDateFromText("Notre mariage le 14 août 2027", { now: NOW }).found).toEqual({ day: true, month: true, year: true });
    expect(parseDateFromText("Notre mariage au printemps", { now: NOW }).found).toEqual({ day: false, month: false, year: false });
    const fallback = parseDateFromText("Notre mariage au printemps", { now: NOW });
    expect(fallback.confidence).toBe("deduit");
    expect(parts(fallback.value)).toEqual({ day: 14, month: 8, year: 2027 });
  });

  it("remonte la date lue jusqu'au projet créé", () => {
    const project = createInitialProject(parseIntention("Notre mariage le 5 août 2027, près de Lille."), "Notre mariage le 5 août 2027, près de Lille.");
    expect(parts(project.pivot.value)).toEqual({ day: 5, month: 7, year: 2027 });
    expect(project.pivot.confidence).toBe("confirme");
  });
});

describe("createInitialProject — le Monde s'ouvre sur un visuel", () => {
  it("pose le grand visuel par défaut du Monde", () => {
    expect(createInitialProject({}, "Notre mariage.").heroVisual).toEqual(DEFAULT_HERO_VISUAL);
  });

  it("garde le visuel choisi par le couple", () => {
    const heroVisual = { kind: "image" as const, url: "data:image/png;base64,AAAA", overlay: 30 };
    expect(createInitialProject({ heroVisual }, "Notre mariage.").heroVisual).toEqual(heroVisual);
  });
});
