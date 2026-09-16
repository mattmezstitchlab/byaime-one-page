import { describe, expect, it } from "vitest";
import {
  answeredFields,
  composeIntention,
  weddingDraftFromAnswers,
} from "./wedding-answers";
import { parseIntention } from "./parser";

/*
 * La donnée structurée est la source de vérité.
 *
 * Le tunnel mariage faisait auparavant : réponses → phrase → relecture de la
 * phrase → projet. Chaque information devait donc survivre à deux
 * transformations. Ces tests verrouillent le remplacement : le projet est
 * construit **depuis les réponses**, et la phrase n'est plus qu'une
 * représentation humaine.
 */

describe("le projet est construit depuis les réponses, pas depuis une phrase", () => {
  it("reprend le jour, le mois et l'année de la date saisie", () => {
    for (const answer of ["14 août 2027", "5 septembre 2026", "1er mars 2028"]) {
      const draft = weddingDraftFromAnswers({ date: answer });
      const at = new Date(draft.pivot!.value as number);
      expect(
        at.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
        answer,
      ).toBe(answer.replace(/^1er /, "1 "));
      expect(draft.pivot!.confidence, answer).toBe("confirme");
    }
  });

  it("un mois sans quantième prend le 1er, quel que soit le jour de la saisie", () => {
    const pivot = new Date(weddingDraftFromAnswers({ date: "septembre 2026" }).pivot!.value as number);
    expect(pivot.getDate()).toBe(1);
    expect(pivot.getMonth()).toBe(8);
  });

  it("lit le lieu, les invités et le budget sans les recomposer", () => {
    const draft = weddingDraftFromAnswers(
      { date: "14 août 2027", place: "Lille", guests: "120", budget: "20 000", tone: "champêtre" },
      { currency: "EUR" },
    );
    expect(draft.universe).toBe("Mariage");
    expect(draft.city?.value).toBe("Lille");
    expect(draft.city?.confidence).toBe("confirme");
    expect(draft.guestsCount?.value).toBe(120);
    expect(draft.budget?.value).toBe(20000);
    expect(draft.currency).toBe("EUR");
  });

  it("une réponse donnée avec sa préposition ne la recopie pas dans le lieu", () => {
    expect(weddingDraftFromAnswers({ place: "près de Nantes" }).city?.value).toBe("Nantes");
    expect(weddingDraftFromAnswers({ place: "à Lyon" }).city?.value).toBe("Lyon");
    expect(weddingDraftFromAnswers({ place: "near Austin" }).city?.value).toBe("Austin");
  });

  it("n'invente rien : ce qui n'est pas répondu reste explicitement manquant", () => {
    const draft = weddingDraftFromAnswers({});
    expect(draft.city?.value).toBeNull();
    expect(draft.city?.confidence).toBe("manquant");
    expect(draft.guestsCount?.value).toBeNull();
    expect(draft.budget?.value).toBeNull();
    /* Sans date, un repère lointain assumé comme déduit — jamais une date
       présentée comme confirmée. */
    expect(draft.pivot?.confidence).toBe("deduit");
  });

  it("garde la devise choisie, et lit l'anglais", () => {
    expect(weddingDraftFromAnswers({ budget: "20000" }, { currency: "GBP" }).currency).toBe("GBP");
    const english = weddingDraftFromAnswers({ date: "September 5, 2026" }, { locale: "en" });
    const at = new Date(english.pivot!.value as number);
    expect(at.getUTCDate()).toBe(5);
    expect(at.getUTCMonth()).toBe(8);
  });

  it("nomme le Monde du couple, et celui d'un client pour un organisateur", () => {
    expect(weddingDraftFromAnswers({}).title).toBe("Notre Mariage");
    expect(weddingDraftFromAnswers({}, { persona: "pro" }).title).toBe("Mariage client");
  });
});

describe("la phrase reste une représentation humaine, plus un transport", () => {
  it("décrit les mêmes réponses, sans rien y ajouter", () => {
    const answers = { date: "14 août 2027", place: "Lille", guests: "120", budget: "20 000", tone: "champêtre" };
    expect(composeIntention(answers)).toBe(
      "Notre mariage le 14 août 2027, près de Lille, 120 invités, 20 000 €, ambiance champêtre.",
    );
    /* La phrase décrit toujours le même projet que les réponses : elle peut
       servir de sous-titre, jamais de source. */
    const fromAnswers = weddingDraftFromAnswers(answers);
    const fromSentence = parseIntention(composeIntention(answers));
    expect(new Date(fromAnswers.pivot!.value as number).getFullYear()).toBe(
      new Date(fromSentence.pivot!.value as number).getFullYear(),
    );
    expect(fromAnswers.guestsCount?.value).toBe(fromSentence.guestsCount?.value);
    expect(fromAnswers.budget?.value).toBe(fromSentence.budget?.value);
  });

  it("ne dit rien de ce qui n'a pas été répondu", () => {
    expect(composeIntention({})).toBe("Notre mariage.");
    expect(composeIntention({ place: "près de Nantes" })).toContain("près de Nantes");
  });

  it("compose en anglais, en dollars, et pour un client", () => {
    const sentence = composeIntention(
      { date: "August 14, 2027", place: "Austin, Texas", guests: "120", budget: "25000", tone: "intimate" },
      { currency: "USD", locale: "en" },
    );
    expect(sentence).toContain("Our wedding on August 14, 2027, near Austin");
    expect(sentence).toContain("120 guests");
    expect(sentence).toContain("$25,000");
    expect(
      composeIntention({ date: "14 août 2027" }, { persona: "pro" }).startsWith("Le mariage client"),
    ).toBe(true);
  });
});

describe("ce qui a été répondu", () => {
  it("ignore les réponses vides ou blanches", () => {
    expect(answeredFields({ date: "14 août 2027", place: "   ", guests: "" })).toEqual(["date"]);
    expect(answeredFields({})).toEqual([]);
  });
});
