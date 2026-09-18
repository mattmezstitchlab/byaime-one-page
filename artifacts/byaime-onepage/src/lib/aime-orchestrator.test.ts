import { describe, expect, it } from "vitest";
import { applyAimeProposalToProject, buildAimeProposalPlan, rejectAimeProposal } from "./aime-orchestrator";
import { createInitialProject, parseIntention } from "./parser";
import { fact, type WorldProject } from "./types";

function bareWorld(): WorldProject {
  const sentence = "Notre mariage le 14 août 2027 près de Lille, 120 invités, budget 20 000 €.";
  return {
    ...createInitialProject(parseIntention(sentence), sentence),
    title: "Notre mariage",
    universe: "Mariage",
    pivot: fact(new Date("2027-08-14T12:00:00").getTime(), "confirme"),
    city: fact("Lille", "confirme"),
    venue: fact(null, "manquant"),
    guestsCount: fact(120, "confirme"),
    budget: fact(20000, "confirme"),
    timeline: [],
    tasks: [],
    guests: [],
    providers: [],
    tables: [],
    payments: [],
    documents: [],
    messageTemplates: [],
  };
}

describe("passe d'orchestration AIME", () => {
  it("décompose une phrase en informations et pose la prochaine question", () => {
    const plan = buildAimeProposalPlan(
      bareWorld(),
      "Nous avons maintenant choisi le Domaine des Roses pour notre cérémonie laïque, 120 invités, budget 20 000 €.",
    );

    expect(plan.operations.find(operation => operation.target === "venue")?.after).toMatchObject({ value: "Domaine des Roses" });
    expect(plan.missing[0]?.sourceStepId).toBe("guests");
    expect(plan.operations.some(operation => operation.kind === "provider")).toBe(true);
    expect(plan.summary).toContain("proposition");
  });

  it("prépare une passe groupée avec Moments, visuels et texte sans écrire", () => {
    const project = bareWorld();
    const plan = buildAimeProposalPlan(project, "Organiser la Timeline, proposer des visuels et préparer un texte public pour la cérémonie.");

    expect(plan.operations.some(operation => operation.kind === "moment")).toBe(true);
    expect(plan.visualProposals.length).toBe(0); // aucune scène à associer tant que les Moments sont seulement proposés
    expect(plan.textProposals).toHaveLength(1);
    expect(project.timeline).toHaveLength(0);
    expect(project.messageTemplates).toHaveLength(0);
  });

  it("propose un visuel sémantique pour un Moment existant", () => {
    const project = bareWorld();
    project.timeline = [{
      id: "ceremony-1",
      time: project.pivot.value,
      kind: "evenement",
      title: "Cérémonie laïque",
      detail: "Échange des vœux",
      status: "prepare",
      confidence: "confirme",
      phase: "pendant",
      universe: "Mariage",
      provenance: "real",
      relations: [],
    }];
    const plan = buildAimeProposalPlan(project, "Proposer une image et une vidéo pour la cérémonie.");

    expect(plan.visualProposals).toHaveLength(1);
    expect(plan.visualProposals[0].zone).toBe("ceremony");
    expect(plan.operations.find(operation => operation.kind === "visual")?.after).toMatchObject({
      provenance: { source: "aime", proposalId: plan.id },
    });

    const heroPlan = buildAimeProposalPlan(project, "Proposer un visuel pour la page publique et le hero.");
    expect(heroPlan.visualProposals.some(proposal => proposal.target === "hero")).toBe(true);
    expect(heroPlan.operations.some(operation => operation.target === "heroVisual")).toBe(true);
  });

  it("n'applique que les propositions sélectionnées et journalise la décision", () => {
    const project = bareWorld();
    const plan = buildAimeProposalPlan(project, "Notre mariage le 21 août 2027 à Paris, 80 invités.");
    const selected = plan.operations.find(operation => operation.target === "city");
    expect(selected).toBeDefined();
    const editedPlan = {
      ...plan,
      operations: plan.operations.map(operation => ({ ...operation, selected: operation.id === selected?.id })),
    };

    const next = applyAimeProposalToProject(project, editedPlan);
    expect(next.city.value).toBe("Paris");
    expect(next.pivot.value).toBe(project.pivot.value);
    expect(next.aimeProposalHistory?.[0]).toMatchObject({
      id: plan.id,
      status: "applied",
      acceptedOperationIds: [selected?.id],
    });
  });

  it("refuser une passe ne modifie pas les données métier mais reste traçable", () => {
    const project = bareWorld();
    const plan = buildAimeProposalPlan(project, "Notre mariage le 21 août 2027 à Paris.");
    const next = rejectAimeProposal(project, plan);

    expect(next.city.value).toBe(project.city.value);
    expect(next.pivot.value).toBe(project.pivot.value);
    expect(next.aimeProposalHistory?.[0]).toMatchObject({ id: plan.id, status: "rejected" });
  });
});

describe("protection contre une proposition obsolète", () => {
  it("ne remplace pas une valeur modifiée depuis la proposition", () => {
    const project = bareWorld();
    const plan = buildAimeProposalPlan(project, "Notre mariage le 21 août 2027 près de Paris.");
    const current = { ...project, city: fact("Lyon", "confirme") };
    const next = applyAimeProposalToProject(current, plan);

    expect(next.city.value).toBe("Lyon");
    expect(next.aimeProposalHistory?.[0]?.conflictedOperationIds?.length).toBeGreaterThan(0);
  });
});
