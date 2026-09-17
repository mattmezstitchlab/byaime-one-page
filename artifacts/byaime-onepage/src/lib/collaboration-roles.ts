import { translate, type Locale } from "./i18n-dictionary";

export type CollaborationRole = "owner" | "planner" | "family" | "viewer";
export type InvitationRole = Exclude<CollaborationRole, "owner">;

export const COLLABORATION_ROLE_POLICY = {
  owner: {
    canEdit: true,
    canManageAccess: true,
    canPublish: true,
    canDelete: true,
    projection: "full",
  },
  planner: {
    canEdit: true,
    canManageAccess: true,
    canPublish: false,
    canDelete: false,
    /* Le planificateur voit réellement les finances et les documents dans le
       Graphe et la barre du Monde : la politique l'assume au lieu de promettre
       l'inverse. Seuls publication, suppression et gestion des accès restent
       au propriétaire. */
    projection: "shared-with-finances",
  },
  family: {
    canEdit: true,
    canManageAccess: false,
    canPublish: false,
    canDelete: false,
    projection: "shared-without-finances-or-documents",
  },
  viewer: {
    canEdit: false,
    canManageAccess: false,
    canPublish: false,
    canDelete: false,
    projection: "audience",
  },
} as const satisfies Record<CollaborationRole, {
  canEdit: boolean;
  canManageAccess: boolean;
  canPublish: boolean;
  canDelete: boolean;
  projection: string;
}>;

const INVITATION_ROLE_OPTIONS_BASE: ReadonlyArray<{
  value: InvitationRole;
  labelKey: `role.option.${InvitationRole}`;
}> = [
  { value: "planner", labelKey: "role.option.planner" },
  { value: "family", labelKey: "role.option.family" },
  { value: "viewer", labelKey: "role.option.viewer" },
];

/** Les rôles d'invitation, traduits dans la langue courante (FR/EN). */
export function getInvitationRoleOptions(locale: Locale): ReadonlyArray<{
  value: InvitationRole;
  label: string;
}> {
  return INVITATION_ROLE_OPTIONS_BASE.map(option => ({
    value: option.value,
    label: translate(locale, option.labelKey),
  }));
}

/** Le rôle effectif, en mot simple (plus « owner » dans l'interface). */
export function roleDisplayName(role: string, locale: Locale): string {
  if (role === "owner" || role === "planner" || role === "family" || role === "viewer") {
    return translate(locale, `roleName.${role}` as `roleName.${CollaborationRole}`);
  }
  return role;
}