import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CoupleReport } from "./CoupleReport";
import { formatCents } from "@/lib/money";
import type { WorldProject } from "@/lib/types";

/*
 * Verrouille le livrable : frontispice, déroulé du Jour J, argent en quatre
 * chiffres, invités, documents datés — et la disparition des sections vides.
 * Aucune chaîne testée ne contient d'apostrophe : renderToStaticMarkup rend
 * les entités typographiques telles quelles.
 */

const DAY = 86_400_000;
const NOW = Date.UTC(2027, 5, 1, 12, 0, 0);

const project = {
  id: "p1",
  title: "Camille et Jules",
  subtitle: "Un mariage en juin",
  currency: "EUR",
  pivot: { value: NOW + 30 * DAY },
  timeline: [
    { id: "e1", title: "Dégustation", time: NOW + 9 * DAY, phase: "avant", kind: "evenement", status: "prepare", confidence: "confirme", universe: "vie", visibility: "equipe" },
    { id: "e2", title: "Cérémonie", time: NOW + 30 * DAY, phase: "pendant", kind: "evenement", status: "prepare", confidence: "confirme", universe: "vie", visibility: "audience", location: "Salle des fêtes" },
  ],
  tasks: [{ id: "t1", title: "Relancer le traiteur", phase: "3-6m", status: "en_cours", priority: "haute", dueDate: NOW - DAY }],
  documents: [{ id: "d1", title: "Contrat salle", kind: "contrat", at: NOW - 5 * DAY }],
  payments: [{ id: "pay1", label: "Acompte salle", amountCents: 100_000, at: NOW - 2 * DAY, state: "paye" }],
  providers: [{ id: "pr1", category: "traiteur", role: "Traiteur", status: "reserve", amountCents: 620_000 }],
  guests: [{ id: "g1", name: "Camille", role: "invite", rsvp: "confirme" }],
} as unknown as WorldProject;

describe("le livrable CoupleReport", () => {
  it("ouvre sur le frontispice du mariage", () => {
    const html = renderToStaticMarkup(<CoupleReport project={project} now={NOW} />);

    expect(html).toContain("Camille et Jules");
    expect(html).toContain("Un mariage en juin");
    expect(html).toContain("Présenté le");
    expect(html).toContain("Le rapport");
  });

  it("déroule le Jour J en page verticale", () => {
    const html = renderToStaticMarkup(<CoupleReport project={project} now={NOW} />);

    expect(html).toContain("Le Jour J, minute par minute");
    expect(html).toContain("Dégustation");
    expect(html).toContain("Cérémonie");
    expect(html).toContain("Salle des fêtes");
  });

  it("présente l'argent en quatre chiffres, formatés", () => {
    const html = renderToStaticMarkup(<CoupleReport project={project} now={NOW} />);

    expect(html).toContain("Engagé");
    expect(html).toContain("Payé");
    expect(html).toContain("Échu");
    expect(html).toContain("Restant");
    expect(html).toContain(formatCents(620_000, "EUR"));
    expect(html).toContain("Réservé");
  });

  it("date les documents et compte les invités", () => {
    const html = renderToStaticMarkup(<CoupleReport project={project} now={NOW} />);

    expect(html).toContain("Contrat salle");
    expect(html).toContain("Confirmés");
  });

  it("fait disparaître les sections vides", () => {
    const vide = {
      ...project,
      timeline: [],
      tasks: [],
      guests: [],
      documents: [],
      payments: [],
      providers: [],
    } as unknown as WorldProject;
    const html = renderToStaticMarkup(<CoupleReport project={vide} now={NOW} />);

    expect(html).not.toContain("data-testid=\"couple-report-budget\"");
    expect(html).not.toContain("data-testid=\"couple-report-invites\"");
    expect(html).not.toContain("data-testid=\"couple-report-moments\"");
  });
});
