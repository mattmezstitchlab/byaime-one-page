import { describe, expect, it } from "vitest";
import { parseIntention, createInitialProject } from "./parser";

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
