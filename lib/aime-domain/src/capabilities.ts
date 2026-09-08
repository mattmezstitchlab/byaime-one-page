import type {
  Capability,
  CapabilityContext,
  CapabilityDecision,
  DataLevel,
  LegacyProjectRole,
  SpecializedPermission,
  SoundAccessRole,
  WorldAccessRole,
} from "./types";

const EDITING_ROLES = new Set<WorldAccessRole>(["owner", "admin", "editor"]);
const CONTRIBUTING_ROLES = new Set<WorldAccessRole>([
  "owner",
  "admin",
  "editor",
  "contributor",
]);
const SOUND_CONTRIBUTING_ROLES = new Set<SoundAccessRole>([
  "owner",
  "curator",
  "contributor",
]);
const SOUND_DISCUSSION_ROLES = new Set<SoundAccessRole>([
  ...SOUND_CONTRIBUTING_ROLES,
  "commenter",
  "reviewer",
  "moderator",
]);
const SOUND_REVIEWING_ROLES = new Set<SoundAccessRole>([
  "owner",
  "curator",
  "reviewer",
  "moderator",
]);

const permission = (
  context: CapabilityContext,
  value: SpecializedPermission,
): boolean => context.permissions?.has(value) ?? false;

const allow = (
  reason: string,
  requiresConfirmation = false,
): CapabilityDecision => ({
  allowed: true,
  reason,
  ...(requiresConfirmation ? { requiresConfirmation: true } : {}),
});

const deny = (
  reason: string,
  requiresAuthentication = false,
): CapabilityDecision => ({
  allowed: false,
  reason,
  ...(requiresAuthentication ? { requiresAuthentication: true } : {}),
});

export function mapLegacyProjectRole(
  role: LegacyProjectRole,
): WorldAccessRole {
  if (role === "planner") return "editor";
  if (role === "family") return "contributor";
  return role;
}

export function canReadDataLevel(
  level: DataLevel,
  context: CapabilityContext,
): CapabilityDecision {
  if (level === "public") return allow("Donnée publique.");
  if (!context.authenticated) {
    return deny("Connexion requise pour cette donnée.", true);
  }
  if (context.socialRelation === "blocked") {
    return deny("Accès bloqué.");
  }
  if (level === "network") {
    return context.socialRelation && context.socialRelation !== "visitor"
      ? allow("Relation réseau autorisée.")
      : deny("Cette donnée est réservée au réseau autorisé.");
  }
  if (level === "world") {
    return context.worldRole
      ? allow("Membre autorisé du Monde.")
      : deny("Cette donnée est réservée aux membres du Monde.");
  }
  if (level === "operations") {
    return context.worldRole &&
      (context.worldRole === "owner" ||
        permission(context, "documents.operations.read"))
      ? allow("Accès opérationnel explicite.")
      : deny("Une permission opérationnelle explicite est requise.");
  }
  if (level === "financial") {
    return context.worldRole &&
      (context.worldRole === "owner" ||
        permission(context, "documents.financial.read") ||
        permission(context, "payments.read"))
      ? allow("Accès financier explicite.")
      : deny("Une permission financière explicite est requise.");
  }
  if (level === "private") {
    return context.subjectOwned ||
      permission(context, "documents.private.read")
      ? allow("Accès privé explicite.")
      : deny("Cette donnée est privée.");
  }
  if (level === "exact_location") {
    return context.subjectOwned ||
      permission(context, "locations.exact.read")
      ? allow("Accès explicite à la localisation exacte.")
      : deny("La localisation exacte exige un consentement et une permission dédiés.");
  }
  return permission(context, "moderation.review")
    ? allow("Accès modération explicite.")
    : deny("Cette donnée est réservée à la modération.");
}

export function evaluateCapability(
  capability: Capability,
  context: CapabilityContext,
): CapabilityDecision {
  if (context.socialRelation === "blocked" && capability !== "card.view") {
    return deny("Action indisponible en raison d’un blocage.");
  }

  if (capability === "card.view") {
    if (context.subjectPublic) return allow("Carte publique.");
    if (!context.authenticated) return deny("Connexion requise.", true);
    return context.socialRelation && context.socialRelation !== "visitor"
      ? allow("Relation autorisée avec cette Carte.")
      : deny("Cette Carte n’est pas visible dans ce contexte.");
  }
  if (capability === "sound.view") {
    return canReadDataLevel(context.dataLevel ?? "world", context);
  }

  if (!context.authenticated) {
    return deny("Connexion requise pour cette action.", true);
  }

  if (capability === "card.follow") {
    return context.subjectOwned
      ? deny("Une Card ne se suit pas elle-même.")
      : allow("La Card peut être suivie.");
  }
  if (capability === "card.contact") {
    return context.contactAllowed
      ? allow("Le contact est autorisé par les préférences de la Card.")
      : deny("Le contact n’est pas autorisé par cette Card.");
  }
  if (capability === "card.edit") {
    return context.subjectOwned || context.socialRelation === "card_admin"
      ? allow("Propriétaire ou administration déléguée.")
      : deny("Seuls le propriétaire ou un administrateur délégué peuvent modifier cette Card.");
  }
  if (capability === "card.location.exact.read") {
    return canReadDataLevel("exact_location", context);
  }
  if (capability === "card.location.exact.edit") {
    return context.subjectOwned ||
      permission(context, "locations.exact.edit")
      ? allow("Modification de localisation autorisée.", true)
      : deny("La localisation exacte ne peut être modifiée sans délégation explicite.");
  }
  if (capability === "world.view") {
    return context.worldPublic || context.worldRole
      ? allow(context.worldPublic ? "Monde public." : "Membre autorisé du Monde.")
      : deny("Ce Monde n’est pas visible dans ce contexte.");
  }
  if (capability === "world.join.request") {
    return context.worldRole
      ? deny("Cette Card participe déjà au Monde.")
      : allow("Une demande d’accès peut être proposée.");
  }
  if (capability === "world.edit") {
    return context.worldRole && EDITING_ROLES.has(context.worldRole)
      ? allow("Rôle d’édition autorisé.")
      : deny("Un rôle d’édition est requis.");
  }
  if (capability === "world.invite") {
    return context.worldRole === "owner" ||
      context.worldRole === "admin" ||
      permission(context, "members.invite")
      ? allow("Invitation autorisée.")
      : deny("Une capacité d’invitation est requise.");
  }
  if (capability === "world.manage_members") {
    return context.worldRole === "owner" || context.worldRole === "admin"
      ? allow("Gestion des membres autorisée.")
      : deny("Seuls le propriétaire et les administrateurs gèrent les membres.");
  }
  if (capability === "world.manage_modules") {
    return context.worldRole === "owner" ||
      context.worldRole === "admin" ||
      permission(context, "modules.manage")
      ? allow("Gestion des modules autorisée.")
      : deny("Une capacité de gestion des modules est requise.");
  }
  if (capability === "world.publish") {
    return context.worldRole === "owner" ||
      context.worldRole === "admin" ||
      (context.worldRole === "editor" && permission(context, "media.publish"))
      ? allow("Publication autorisée.", true)
      : deny("La publication exige une responsabilité dédiée.");
  }
  if (capability === "world.export") {
    return context.worldRole === "owner" ||
      permission(context, "world.export")
      ? allow("Export autorisé et journalisé.", true)
      : deny("Une capacité d’export explicite est requise.");
  }
  if (capability === "world.delete") {
    return context.worldRole === "owner" ||
      permission(context, "world.delete")
      ? allow("Suppression autorisée.", true)
      : deny("Seul le propriétaire peut supprimer ce Monde.");
  }
  if (capability === "moment.create") {
    return context.worldRole && CONTRIBUTING_ROLES.has(context.worldRole)
      ? allow("Contribution temporelle autorisée.")
      : deny("Un rôle de contribution est requis.");
  }
  if (capability === "moment.edit") {
    if (context.worldRole && EDITING_ROLES.has(context.worldRole)) {
      return allow("Rôle d’édition autorisé.");
    }
    return context.worldRole === "contributor" && context.ownsContribution
      ? allow("Le contributeur peut modifier sa contribution.")
      : deny("Cette personne ne peut pas modifier ce Moment.");
  }
  if (capability === "document.upload") {
    return context.worldRole && CONTRIBUTING_ROLES.has(context.worldRole)
      ? allow("Dépôt autorisé.")
      : deny("Un rôle de contribution est requis pour déposer un document.");
  }
  if (capability === "document.read") {
    return canReadDataLevel(context.dataLevel ?? "world", context);
  }
  if (capability === "document.analyze") {
    return context.worldRole && CONTRIBUTING_ROLES.has(context.worldRole)
      ? allow("Analyse autorisée ; les résultats resteront des propositions.")
      : deny("Un rôle de contribution est requis pour demander une analyse.");
  }
  if (capability === "proposal.validate") {
    return context.worldRole &&
      (EDITING_ROLES.has(context.worldRole) ||
        permission(context, "proposal.validate"))
      ? allow("Validation de proposition autorisée.", true)
      : deny("Un rôle d’édition ou une délégation explicite est requis.");
  }
  if (capability === "payment.read") {
    return canReadDataLevel("financial", context);
  }
  if (capability === "payment.manage") {
    return context.worldRole === "owner" ||
      permission(context, "payments.manage")
      ? allow("Gestion financière autorisée.", true)
      : deny("Une capacité financière explicite est requise.");
  }
  if (capability === "media.publish") {
    return context.subjectOwned ||
      context.worldRole === "owner" ||
      context.worldRole === "admin" ||
      permission(context, "media.publish")
      ? allow("Publication média autorisée.", true)
      : deny("Les droits de publication du média sont requis.");
  }
  if (capability === "sound.contribute") {
    return context.soundRole &&
      SOUND_CONTRIBUTING_ROLES.has(context.soundRole)
      ? allow("Contribution sonore autorisée dans cet espace.")
      : deny("Un rôle sonore de contribution est requis.");
  }
  if (capability === "sound.comment" || capability === "sound.vote") {
    return context.soundRole &&
      SOUND_DISCUSSION_ROLES.has(context.soundRole)
      ? allow("Participation à la discussion sonore autorisée.")
      : deny("Un rôle sonore de discussion est requis.");
  }
  if (capability === "sound.review") {
    return context.soundRole &&
      SOUND_REVIEWING_ROLES.has(context.soundRole)
      ? allow("Revue sonore autorisée.")
      : deny("Un rôle sonore de revue est requis.");
  }
  if (capability === "sound.decide") {
    return context.soundRole === "owner" ||
      context.soundRole === "reviewer" ||
      permission(context, "sound.decide")
      ? allow("Décision sonore autorisée.", true)
      : deny("Une autorité sonore de décision est requise.");
  }
  if (capability === "sound.publish") {
    return context.soundRole === "owner" ||
      context.soundRole === "moderator" ||
      permission(context, "sound.publish")
      ? allow("Publication sonore autorisée.", true)
      : deny("Une autorité sonore de publication est requise.");
  }
  if (capability === "sound.control_session") {
    return context.soundRole === "owner" ||
      context.soundRole === "operator" ||
      permission(context, "sound.control_session")
      ? allow("Contrôle de session sonore autorisé.")
      : deny("Un rôle de régie sonore est requis.");
  }
  if (capability === "sound.manage_rights") {
    return context.soundRole === "owner" ||
      permission(context, "sound.manage_rights")
      ? allow("Gestion des déclarations de droits autorisée.", true)
      : deny("Une délégation explicite est requise pour gérer les droits.");
  }
  if (capability === "sound.moderate") {
    return context.soundRole === "moderator" ||
      permission(context, "sound.moderate")
      ? allow("Modération sonore autorisée.")
      : deny("Une capacité de modération sonore est requise.");
  }
  if (capability === "moderation.review") {
    return permission(context, "moderation.review")
      ? allow("Capacité de modération explicite.")
      : deny("Cette action est réservée à la modération.");
  }

  if (capability === "resource.offer" || capability === "resource.request") {
    return allow("Création de ressource autorisée dans ce contexte.");
  }

  return deny("Capacité inconnue.");
}