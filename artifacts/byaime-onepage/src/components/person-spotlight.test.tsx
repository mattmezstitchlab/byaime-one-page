import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/store/project-store", () => {
  const now = Date.now();
  const project = {
    id: "p1",
    providers: [
      { id: "pv1", category: "musique", role: "DJ", name: "DJ Nova", contact: "dj@nova.fr", status: "reserve", nextAction: "Tester la sono à 17h" },
      { id: "pv2", category: "autre", role: "Coordinatrice wedding", name: "June Plan", contact: "+33612121212", status: "reserve" },
    ],
    guests: [
      { id: "g1", name: "Léa Martin", role: "temoin", rsvp: "confirme", dietary: "Végétarien", tableId: "t1", contact: "+33634343434", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false }, notes: "Discours après le dessert" },
    ],
    tables: [{ id: "t1", name: "Table des témoins", capacity: 8 }],
    timeline: [
      { id: "m1", time: now - 3_600_000, durationMinutes: 60, kind: "evenement", title: "Vin d'honneur", status: "execute", phase: "pendant", universe: "mariage", relations: [{ kind: "provider", id: "pv1" }, { kind: "provider", id: "pv2" }] },
      { id: "m2", time: now + 3_600_000, durationMinutes: 120, kind: "evenement", title: "Soirée dansante", status: "prepare", phase: "pendant", universe: "mariage", relations: [{ kind: "provider", id: "pv1" }] },
    ],
  };
  return {
    useProject: () => ({
      project,
      updateEntity: vi.fn(),
      updateProject: vi.fn(),
      removeEntity: vi.fn(),
      canEdit: true,
    }),
  };
});

import { PersonSpotlight } from "./PersonSpotlight";
import { consumeMessageDraft, requestMessage } from "@/lib/person-spotlight-bus";

describe("PersonSpotlight (mini-carte personne)", () => {
  it("montre la mission, le timing et les actions d'un prestataire", () => {
    const markup = renderToStaticMarkup(
      <PersonSpotlight person={{ kind: "provider", id: "pv1" }} momentId="m1" teamContacts={["+33612121212"]} onClose={vi.fn()} />
    );
    expect(markup).toContain('data-testid="person-spotlight"');
    expect(markup).toContain("DJ Nova");
    expect(markup).toContain("Confirmé");
    expect(markup).toContain("Mission du Jour J");
    expect(markup).toContain("Vin d&#x27;honneur");
    expect(markup).toContain("Soirée dansante");
    expect(markup).toContain("Ce Moment");
    expect(markup).toContain("Tester la sono à 17h");
    expect(markup).toContain("Message");
    expect(markup).toContain("Consigne");
    expect(markup).toContain("Consigne à l&#x27;équipe (2)");
    expect(markup).toContain("Fiche");
    expect(markup).not.toContain("tel:");
  });

  it("distingue le chef d'orchestre et propose l'appel quand le contact est un téléphone", () => {
    const markup = renderToStaticMarkup(
      <PersonSpotlight person={{ kind: "provider", id: "pv2" }} momentId="m1" onClose={vi.fn()} />
    );
    expect(markup).toContain("June Plan");
    expect(markup).toContain("Chef d&#x27;orchestre");
    expect(markup).toContain("tel:+33612121212");
    expect(markup).toContain("Appeler");
  });

  it("montre la table, le régime, la présence et les notes d'un invité", () => {
    const markup = renderToStaticMarkup(
      <PersonSpotlight person={{ kind: "guest", id: "g1" }} onClose={vi.fn()} />
    );
    expect(markup).toContain("Léa Martin");
    expect(markup).toContain("Témoin");
    expect(markup).toContain("Table des témoins");
    expect(markup).toContain("Végétarien");
    expect(markup).toContain("Cérémonie");
    expect(markup).toContain("Vin d&#x27;honneur");
    expect(markup).toContain("Dîner");
    expect(markup).not.toContain("Brunch");
    expect(markup).toContain("Discours après le dessert");
    expect(markup).toContain("tel:+33634343434");
    expect(markup).toContain("Fiche");
    expect(markup).not.toContain("Mission du Jour J");
    expect(markup).not.toContain("Consigne");
  });

  it("ne rend rien pour une personne inconnue", () => {
    const markup = renderToStaticMarkup(
      <PersonSpotlight person={{ kind: "guest", id: "nope" }} onClose={vi.fn()} />
    );
    expect(markup).not.toContain('data-testid="person-spotlight"');
  });
});

describe("person-spotlight-bus (brouillon message)", () => {
  it("dépose un brouillon consommé une seule fois", () => {
    requestMessage({ recipients: "dj@nova.fr", subject: "Consigne", body: "" });
    expect(consumeMessageDraft()).toEqual({ recipients: "dj@nova.fr", subject: "Consigne", body: "" });
    expect(consumeMessageDraft()).toBeNull();
  });
});
