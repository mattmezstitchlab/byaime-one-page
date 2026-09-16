import { describe, expect, it } from "vitest";
import { ROLE_GROUPS } from "@workspace/aime-domain";

import { translate } from "./i18n-dictionary";
import {
  activityOptions,
  detectProfile,
  emptyOneboardingContext,
  resolveOneboardingPlan,
  suggestRolesFromActivities,
} from "./oneboarding-plan";

/*
 * Le plan du Oneboarding, contrôlé sans React ni réseau : c'est lui qui décide
 * quoi demander, et une erreur ici se verrait dans chaque parcours.
 *
 * Trois invariants verrouillés :
 *  - cinq étapes, toujours — y compris quand tout est déjà connu ;
 *  - le rôle appartient au mariage, l'activité à la personne ;
 *  - aucune valeur de rôle inventée (le serveur refuserait).
 */

const ids = (roles: string[]) => resolveOneboardingPlan({ ...emptyOneboardingContext(), weddingRoles: roles }).steps.map(s => s.id);

describe("détection du profil depuis les rôles du mariage", () => {
  it("reconnaît les mariés, et leur donne la priorité sur un métier", () => {
    expect(detectProfile(["Mariée"])).toBe("couple");
    /* Un marié photographe de son propre mariage reste d'abord un marié. */
    expect(detectProfile(["Marié", "Photographe"])).toBe("couple");
  });

  it("reconnaît l'organisation, les prestataires et l'entourage", () => {
    expect(detectProfile(["Wedding planner"])).toBe("planner");
    expect(detectProfile(["Saxophoniste"])).toBe("professional");
    expect(detectProfile(["Témoin"])).toBe("guest");
    expect(detectProfile(["Mère de la mariée"])).toBe("guest");
    expect(detectProfile(["Invité"])).toBe("guest");
  });

  it("ne connaît pas de profil tant qu'aucun rôle n'est dit", () => {
    expect(detectProfile([])).toBe("unknown");
  });

  it("ignore une valeur qui n'existe pas dans le modèle", () => {
    /* Le serveur rejette tout rôle hors ROLE_GROUPS : le plan ne doit pas en
       faire un profil. */
    expect(detectProfile(["Astronaute"])).toBe("unknown");
    expect(detectProfile(["Astronaute", "DJ"])).toBe("professional");
  });

  it("n'utilise que des rôles réellement présents dans le modèle", () => {
    const all = Object.values(ROLE_GROUPS).flat() as string[];
    for (const role of ["Marié", "Mariée", "Wedding planner", "Photographe", "Saxophoniste", "Témoin", "Invité", "Famille", "Mère du marié", "Père de la mariée"]) {
      expect(all, `${role} absent du modèle`).toContain(role);
    }
  });
});

describe("le plan garde cinq étapes, quel que soit le profil", () => {
  it("cinq étapes pour chaque profil, et pour le profil inconnu", () => {
    for (const roles of [[], ["Mariée"], ["Wedding planner"], ["Photographe"], ["Invité"], ["Témoin"], ["Famille"]]) {
      const { steps } = resolveOneboardingPlan({ ...emptyOneboardingContext(), weddingRoles: roles });
      expect(steps, `rôles ${roles.join("/")}`).toHaveLength(5);
      expect(steps[0].id).toBe("person");
      expect(steps[1].id).toBe("role");
      expect(steps[4].id).toBe("confirm");
    }
  });

  it("reste à cinq étapes même quand tout est déjà connu", () => {
    const { steps } = resolveOneboardingPlan({
      cardSaved: true,
      activities: ["Photographe"],
      configuredActivities: ["Photographe"],
      selectedActivities: ["Photographe"],
      weddingRoles: ["Photographe"],
      wedding: { id: "w1", label: "Claire & Thomas" },
      participationSaved: true,
    });
    expect(steps).toHaveLength(5);
    /* Le repère ne se réduit jamais : les étapes connues restent traversées. */
    expect(steps.filter(s => s.known).length).toBeGreaterThan(0);
    expect(steps[4].known, "la confirmation est un récapitulatif").toBe(false);
  });

  it("compose le tunnel attendu pour chaque profil", () => {
    expect(ids(["Mariée"])).toEqual(["person", "role", "wedding", "organize", "confirm"]);
    expect(ids(["Photographe", "Saxophoniste"])).toEqual(["person", "role", "functioning", "wedding", "confirm"]);
    expect(ids(["Wedding planner"])).toEqual(["person", "role", "functioning", "wedding", "confirm"]);
    expect(ids(["Invité"])).toEqual(["person", "role", "wedding", "presence", "confirm"]);
    /* Rôle pas encore dit : le tunnel neutre, qui sera recalculé à l'étape 2. */
    expect(ids([])).toEqual(["person", "role", "wedding", "presence", "confirm"]);
  });
});

describe("ce qui est déjà connu n'est pas redemandé", () => {
  it("signale la carte connue, sans la retirer du parcours", () => {
    const { steps } = resolveOneboardingPlan({ ...emptyOneboardingContext(), cardSaved: true });
    expect(steps[0].known).toBe(true);
    expect(steps[0].id).toBe("person");
  });

  it("un brouillon local n'est pas une carte enregistrée", () => {
    const { steps } = resolveOneboardingPlan(emptyOneboardingContext());
    expect(steps[0].known).toBe(false);
  });

  it("le fonctionnement n'est connu que si chaque activité choisie est configurée", () => {
    const partial = resolveOneboardingPlan({
      ...emptyOneboardingContext(),
      weddingRoles: ["Photographe", "Saxophoniste"],
      selectedActivities: ["Photographe", "Saxophoniste"],
      configuredActivities: ["Photographe"],
    });
    expect(partial.steps[2].known).toBe(false);
    expect(partial.steps[2].required).toBe(true);

    const complete = resolveOneboardingPlan({
      ...emptyOneboardingContext(),
      weddingRoles: ["Photographe", "Saxophoniste"],
      selectedActivities: ["Photographe", "Saxophoniste"],
      configuredActivities: ["Photographe", "Saxophoniste"],
    });
    expect(complete.steps[2].known).toBe(true);
    expect(complete.steps[2].required).toBe(false);
  });

  it("cocher un rôle ne verrouille pas l'étape : « connu » veut dire déjà enregistré", () => {
    /* Si la saisie en cours rendait l'étape « connue », elle passerait en
       lecture seule au premier clic : impossible de cocher un second rôle ou de
       choisir ses activités. Le rôle n'est connu qu'une fois enregistré. */
    const typing = resolveOneboardingPlan({
      ...emptyOneboardingContext(),
      weddingRoles: ["Photographe"],
      participationSaved: false,
    });
    expect(typing.steps[1].known).toBe(false);
    /* Le profil, lui, suit la saisie : c'est ce qui choisit la suite du tunnel. */
    expect(typing.profile).toBe("professional");

    const saved = resolveOneboardingPlan({
      ...emptyOneboardingContext(),
      weddingRoles: ["Photographe"],
      participationSaved: true,
    });
    expect(saved.steps[1].known).toBe(true);
  });

  it("le rôle n'est pas connu du seul fait d'avoir des activités personnelles", () => {
    /* Cœur de la règle « le rôle appartient au mariage » : être photographe et
       saxophoniste ne dit rien du mariage qu'on rejoint. */
    const { steps } = resolveOneboardingPlan({
      ...emptyOneboardingContext(),
      activities: ["Photographe", "Saxophoniste"],
      selectedActivities: ["Photographe", "Saxophoniste"],
      weddingRoles: [],
    });
    expect(steps[1].known).toBe(false);
  });
});

describe("activité personnelle → rôle proposé, jamais imposé", () => {
  it("propose les métiers reconnus par le modèle des rôles", () => {
    expect(suggestRolesFromActivities(["Photographe", "Saxophoniste"])).toEqual(["Photographe", "Saxophoniste"]);
  });

  it("ne propose rien pour une activité hors modèle", () => {
    expect(suggestRolesFromActivities(["Dresseur de faucons"])).toEqual([]);
  });

  it("expose les propositions sans jamais écrire dans weddingRoles", () => {
    const context = {
      ...emptyOneboardingContext(),
      selectedActivities: ["Saxophoniste"],
      weddingRoles: [],
    };
    const plan = resolveOneboardingPlan(context);
    expect(plan.suggestedRoles).toEqual(["Saxophoniste"]);
    /* La source reste inchangée : la confirmation appartient à la personne. */
    expect(context.weddingRoles).toEqual([]);
    expect(plan.profile).toBe("unknown");
  });

  it("liste les activités depuis le modèle existant, sans doublon", () => {
    const options = activityOptions(["Photographe"], ["Photographe", "DJ"]);
    expect(new Set(options).size).toBe(options.length);
    expect(options).toContain("Saxophoniste");
    expect(options).toContain("DJ");
  });
});

describe("aucune étape n'invente un niveau", () => {
  it("chaque étape déclare ce qu'elle écrit, et rien d'autre", () => {
    const { steps } = resolveOneboardingPlan({ ...emptyOneboardingContext(), weddingRoles: ["Photographe"] });
    expect(steps[0].saves).toEqual(["card"]);
    expect(steps[1].saves).toEqual(["activities"]);
    expect(steps[2].saves).toEqual(["functioning"]);
    expect(steps[3].saves).toEqual(["project", "participation"]);
    expect(steps[4].saves).toEqual([]);
  });

  it("la confirmation n'écrit rien", () => {
    const { steps } = resolveOneboardingPlan({ ...emptyOneboardingContext(), weddingRoles: ["Invité"] });
    expect(steps[4].id).toBe("confirm");
    expect(steps[4].saves).toEqual([]);
    expect(steps[4].required).toBe(false);
  });

  it("ouvre un Monde pour le couple et l'organisation, le fait rejoindre aux autres", () => {
    expect(resolveOneboardingPlan({ ...emptyOneboardingContext(), weddingRoles: ["Marié"] }).weddingAction).toBe("create");
    expect(resolveOneboardingPlan({ ...emptyOneboardingContext(), weddingRoles: ["Wedding planner"] }).weddingAction).toBe("create");
    expect(resolveOneboardingPlan({ ...emptyOneboardingContext(), weddingRoles: ["Photographe"] }).weddingAction).toBe("join");
    expect(resolveOneboardingPlan({ ...emptyOneboardingContext(), weddingRoles: ["Invité"] }).weddingAction).toBe("join");
  });

  it("nomme les étapes dans le vocabulaire de la personne", () => {
    const { steps } = resolveOneboardingPlan({ ...emptyOneboardingContext(), weddingRoles: ["Photographe"] });
    for (const forbidden of ["Universal Card", "Membership", "Projection", "Assignment", "Contexte", "Participation"]) {
      for (const item of steps) {
        expect(
          `${translate("fr", item.titleKey)} ${translate("fr", item.descriptionKey)}`,
        ).not.toContain(forbidden);
      }
    }
    expect(steps.map((s) => translate("fr", s.titleKey))).toEqual([
      "Commençons par vous",
      "Votre rôle",
      "Mon fonctionnement",
      "Le mariage",
      "Ma Timeline est prête",
    ]);
  });

  it("suit la langue du cadre : les titres ne sont plus figés en français", () => {
    const { steps } = resolveOneboardingPlan({
      ...emptyOneboardingContext(),
      weddingRoles: ["Photographe"],
    });
    /* Le repère « Question X of 5 » est piloté par la locale ; les titres
       d'étapes doivent l'être aussi, sinon l'anglais affiche un mélange. */
    expect(steps.map((s) => translate("en", s.titleKey))).toEqual([
      "Let’s start with you",
      "Your role",
      "How I work",
      "The wedding",
      "Your Timeline is ready",
    ]);
    /* Chaque étape a bien ses deux clés dans les deux langues. */
    for (const locale of ["fr", "en"] as const) {
      for (const item of steps) {
        expect(translate(locale, item.titleKey).length).toBeGreaterThan(2);
        expect(translate(locale, item.descriptionKey).length).toBeGreaterThan(2);
      }
    }
  });
});
