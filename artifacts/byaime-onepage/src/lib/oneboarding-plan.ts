import { ROLE_GROUPS } from "@workspace/aime-domain";

import type { I18nKey } from "./i18n-dictionary";

/*
 * Le plan du Oneboarding BYAIME — une dérivation pure, sans React ni réseau.
 *
 * Ce module répond à une seule question : **que doit-on encore demander à cette
 * personne, et dans quel ordre ?** Il ne sait ni afficher, ni enregistrer.
 *
 * Trois règles invariantes, issues de l'architecture existante :
 *
 * 1. **Cinq étapes, toujours.** Le repère « Question X sur 5 » ne change pas,
 *    même quand BYAIME connaît déjà la réponse. Une étape connue est préremplie,
 *    signalée comme telle, lisible et modifiable — jamais supprimée. La personne
 *    traverse donc toujours le même parcours, pas un parcours reconstruit.
 *
 * 2. **Trois niveaux, jamais quatre.** Ma carte → Mon activité → Ce mariage.
 *    `person` écrit la carte, `functioning` écrit les activités de la personne,
 *    `wedding` / `presence` écrivent ce mariage. Aucune étape ne mélange les
 *    niveaux, et aucune n'en invente un quatrième.
 *
 * 3. **Le rôle appartient au mariage, l'activité à la personne.** Une activité
 *    (Photographe, Saxophoniste) est une donnée personnelle, configurable hors
 *    de tout mariage. Le rôle dans un mariage est une donnée du mariage : une
 *    activité peut le *proposer*, jamais le décréter. La règle serveur
 *    (`assignmentErrors` : une intervention exige que le métier figure aussi
 *    parmi les rôles du mariage) reste la source de vérité — le plan se contente
 *    d'éviter la double saisie en pré-cochant, à confirmer.
 */

const COUPLE_ROLES: readonly string[] = ROLE_GROUPS.Couple;
const FAMILY_ROLES: readonly string[] = ROLE_GROUPS.Famille;
const CIRCLE_ROLES: readonly string[] = ROLE_GROUPS.Entourage;
const PROFESSIONAL_ROLES: readonly string[] = ROLE_GROUPS.Professionnels;
/** Le rôle d'organisation reconnu par le modèle existant. */
const PLANNER_ROLE = "Wedding planner";

export const ALL_WEDDING_ROLES: readonly string[] = [
  ...COUPLE_ROLES,
  ...FAMILY_ROLES,
  ...CIRCLE_ROLES,
  ...PROFESSIONAL_ROLES,
];

/** Profil déduit des rôles choisis pour ce mariage. Jamais stocké tel quel. */
export type OneboardingProfile =
  | "unknown"
  | "couple"
  | "planner"
  | "professional"
  | "guest";

export function detectProfile(roles: readonly string[]): OneboardingProfile {
  const chosen = roles.filter((role) => ALL_WEDDING_ROLES.includes(role));
  if (!chosen.length) return "unknown";
  /* Le couple prime : un marié qui est aussi photographe de son propre mariage
     reste d'abord un marié — c'est lui qui crée le Monde. */
  if (chosen.some((role) => COUPLE_ROLES.includes(role))) return "couple";
  if (chosen.includes(PLANNER_ROLE)) return "planner";
  if (chosen.some((role) => PROFESSIONAL_ROLES.includes(role))) return "professional";
  /* Reste : famille et entourage. */
  return "guest";
}

export type OneboardingStepId =
  /** Moi — identité, expression, musique. Écrit la carte. */
  | "person"
  /** Votre rôle — rôles pour ce mariage + activités de la personne. */
  | "role"
  /** Mon fonctionnement — paramètres des activités choisies. */
  | "functioning"
  /** Le mariage — créer ou rejoindre, puis ce qui concerne ce mariage. */
  | "wedding"
  /** Ma présence — RSVP, moments, arrivée, départ, besoins. */
  | "presence"
  /** Mon organisation — les moments du couple, mêmes données que la présence. */
  | "organize"
  /** Confirmation — récapitulatif, puis la Timeline. */
  | "confirm";

/** Ce qu'une étape écrit. Vide = l'étape ne persiste rien. */
export type OneboardingSave =
  | "card"
  | "activities"
  | "functioning"
  | "project"
  | "participation";

export type OneboardingStep = {
  id: OneboardingStepId;
  /**
   * Clé i18n du titre visible. Vocabulaire de la personne, jamais de
   * l'architecture.
   *
   * Le plan renvoie une **clé**, pas une phrase : il décide *quoi* demander et
   * dans quel ordre, pas la langue dans laquelle cela s'affiche. C'est la vue
   * qui traduit, pour que le cadre (« Question 1 sur 5 ») et son contenu
   * partagent toujours la même locale.
   */
  titleKey: I18nKey;
  descriptionKey: I18nKey;
  /** BYAIME connaît déjà la réponse : préremplie, lecture seule, « Modifier ». */
  known: boolean;
  saves: OneboardingSave[];
  /**
   * Une écriture obligatoire. Si elle échoue, l'étape suivante est interdite :
   * on ne navigue jamais vers un mariage qui n'existe pas côté serveur.
   */
  required: boolean;
};

export type OneboardingPlan = {
  /** Toujours exactement cinq étapes. */
  steps: OneboardingStep[];
  profile: OneboardingProfile;
  /** « Créer » pour qui ouvre un Monde, « Rejoindre » pour qui y participe. */
  weddingAction: "create" | "join";
  /** Rôles à pré-cocher dans ce mariage, déduits des activités personnelles. */
  suggestedRoles: string[];
};

export type OneboardingContext = {
  /** La carte existe côté serveur (`updatedAt` connu), pas seulement en brouillon. */
  cardSaved: boolean;
  /** Activités de la personne déjà enregistrées, hors de tout mariage. */
  activities: string[];
  /** Activités dont le fonctionnement est déjà renseigné. */
  configuredActivities: string[];
  /** Activités cochées pendant ce Oneboarding (peut dépasser `activities`). */
  selectedActivities: string[];
  /** Rôles pour CE mariage — jamais la liste des activités. */
  weddingRoles: string[];
  /** Le mariage en cours : créé, rejoint, ou déjà sélectionné. */
  wedding: { id: string; label: string } | null;
  /** Une participation est déjà enregistrée pour ce mariage. */
  participationSaved: boolean;
};

/*
 * Note sur `known` : il décrit ce qui était **déjà là**, pas ce qui vient d'être
 * saisi. Une étape dont l'écriture a réussi peut devenir « connue » — la
 * revoir affiche alors un récapitulatif et « Modifier » — mais une étape ne doit
 * jamais se verrouiller pendant qu'on la remplit.
 */

export const emptyOneboardingContext = (): OneboardingContext => ({
  cardSaved: false,
  activities: [],
  configuredActivities: [],
  selectedActivities: [],
  weddingRoles: [],
  wedding: null,
  participationSaved: false,
});

/** Clés i18n par étape — le texte vit dans le dictionnaire, pas ici. */
const STEP_KEYS: Record<
  OneboardingStepId,
  { titleKey: I18nKey; descriptionKey: I18nKey }
> = {
  person: {
    titleKey: "oneboarding.step.person.title",
    descriptionKey: "oneboarding.step.person.description",
  },
  role: {
    titleKey: "oneboarding.step.role.title",
    descriptionKey: "oneboarding.step.role.description",
  },
  functioning: {
    titleKey: "oneboarding.step.functioning.title",
    descriptionKey: "oneboarding.step.functioning.description",
  },
  wedding: {
    titleKey: "oneboarding.step.wedding.title",
    descriptionKey: "oneboarding.step.wedding.description",
  },
  presence: {
    titleKey: "oneboarding.step.presence.title",
    descriptionKey: "oneboarding.step.presence.description",
  },
  organize: {
    titleKey: "oneboarding.step.organize.title",
    descriptionKey: "oneboarding.step.organize.description",
  },
  confirm: {
    titleKey: "oneboarding.step.confirm.title",
    descriptionKey: "oneboarding.step.confirm.description",
  },
};

const step = (
  id: OneboardingStepId,
  known: boolean,
  saves: OneboardingSave[],
  required?: boolean,
): OneboardingStep => ({
  id,
  ...STEP_KEYS[id],
  known,
  saves,
  /* Une étape qui n'écrit rien ne peut pas bloquer : le blocage vient de
     l'échec d'une persistance, jamais d'un récapitulatif. */
  required: required ?? saves.length > 0,
});

/**
 * Les rôles qu'une activité suggère pour ce mariage.
 *
 * Une activité personnelle n'est **pas** un rôle permanent : cette fonction
 * produit une proposition à confirmer, jamais une affectation. Seuls les
 * métiers réellement présents dans le modèle des rôles sont proposés — aucune
 * valeur inventée, sinon le serveur la refuserait.
 */
export function suggestRolesFromActivities(activities: readonly string[]): string[] {
  return activities.filter((activity) => PROFESSIONAL_ROLES.includes(activity));
}

/** Les activités proposées au choix : le modèle existant, plus ce qui existe déjà. */
export function activityOptions(
  knownActivities: readonly string[],
  selected: readonly string[],
): string[] {
  return [...new Set([...PROFESSIONAL_ROLES, ...knownActivities, ...selected])];
}

export function resolveOneboardingPlan(context: OneboardingContext): OneboardingPlan {
  const profile = detectProfile(context.weddingRoles);

  const person = step("person", context.cardSaved, ["card"]);

  /*
   * « Déjà connu » veut dire : BYAIME le savait **avant** cette étape.
   *
   * La distinction est essentielle. Si le simple fait de cocher un rôle rendait
   * l'étape « connue », elle passerait en lecture seule au premier clic : plus
   * moyen de cocher un second rôle, ni de choisir ses activités. Le rôle n'est
   * donc considéré comme connu que lorsqu'il est déjà **enregistré** pour ce
   * mariage — jamais du seul fait de la saisie en cours.
   *
   * Les activités personnelles ne suffisent pas non plus : elles ne disent rien
   * du mariage qu'on rejoint.
   */
  const roleKnown = context.participationSaved && context.weddingRoles.length > 0;
  const role = step("role", roleKnown, ["activities"], context.selectedActivities.length > 0);

  /* Le fonctionnement est connu quand chaque activité choisie est configurée.
     Sans activité choisie, l'étape reste affichée mais vide : elle ne bloque pas. */
  const pendingActivities = context.selectedActivities.filter(
    (activity) => !context.configuredActivities.includes(activity),
  );
  const functioning = step(
    "functioning",
    context.selectedActivities.length > 0 && pendingActivities.length === 0,
    ["functioning"],
    pendingActivities.length > 0,
  );

  const wedding = step("wedding", context.wedding !== null, ["project", "participation"]);
  const presence = step("presence", context.participationSaved, ["participation"]);
  const organize = step("organize", context.participationSaved, ["participation"]);
  /* La confirmation est un récapitulatif : elle n'est jamais « déjà connue »,
     puisqu'elle est justement ce qui montre le reste. */
  const confirm = step("confirm", false, []);

  const steps =
    profile === "couple"
      ? [person, role, wedding, organize, confirm]
      : profile === "professional" || profile === "planner"
        ? [person, role, functioning, wedding, confirm]
        : /* Invité, famille, entourage — et tant que le rôle n'est pas dit. */
          [person, role, wedding, presence, confirm];

  return {
    steps,
    profile,
    weddingAction: profile === "couple" || profile === "planner" ? "create" : "join",
    suggestedRoles: suggestRolesFromActivities(context.selectedActivities),
  };
}
