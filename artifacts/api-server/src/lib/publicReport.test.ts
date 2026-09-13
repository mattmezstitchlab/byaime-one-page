import { describe, expect, it } from "vitest";
import { projectToPublicReport } from "./publicProfile";

/*
 * Le bilan partagé est un choix explicite : sans `publicProfile.shareReport`,
 * la projection est nulle — même si le mini-site invités est publié. Et avec,
 * elle porte le rapport complet, calculé par le domaine partagé.
 */

const dataWith = (publicProfile: Record<string, unknown>) => ({
  id: "0b1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e",
  title: "Camille et Jules",
  data: {
    publicProfile,
    currency: "EUR",
    timeline: [{ id: "e1", time: 100, title: "Cérémonie" }],
    tasks: [{ id: "t1", status: "termine" }],
    guests: [{ id: "g1", rsvp: "confirme" }],
    documents: [{ id: "d1", title: "Contrat salle", kind: "contrat", at: 50 }],
    payments: [{ id: "p1", amountCents: 100_000, state: "paye" }],
    providers: [{ id: "pr1", role: "Traiteur", status: "reserve", amountCents: 620_000 }],
  },
});

describe("projectToPublicReport", () => {
  it("projette le rapport quand le partage est posé", () => {
    const report = projectToPublicReport(dataWith({ published: false, shareReport: true }));

    expect(report).not.toBeNull();
    expect(report?.title).toBe("Camille et Jules");
    expect(report?.rapport.moments.map(m => m.title)).toEqual(["Cérémonie"]);
    expect(report?.rapport.budget?.engagedCents).toBe(620_000);
    expect(report?.rapport.invites?.confirmed).toBe(1);
  });

  it("ne projette rien sans le partage, même mini-site publié", () => {
    expect(projectToPublicReport(dataWith({ published: true }))).toBeNull();
    expect(projectToPublicReport(dataWith({ published: true, shareReport: false }))).toBeNull();
  });

  it("ne projette rien sans données", () => {
    expect(
      projectToPublicReport({ id: "x", title: "x", data: null }),
    ).toBeNull();
  });
});
