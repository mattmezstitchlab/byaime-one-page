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
        projection: "shared-without-finances",
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
};
export const INVITATION_ROLE_OPTIONS = [
    {
        value: "planner",
        label: "Planificateur — peut modifier, gérer les accès et les documents ; finances, publication et suppression restent réservées au propriétaire",
    },
    {
        value: "family",
        label: "Proche — peut modifier le contenu partagé ; finances, documents et Moments privés restent masqués, sans gestion des accès",
    },
    {
        value: "viewer",
        label: "Invité — lecture de la projection destinée à l’audience ; aucune modification, sans finances, documents, prestataires ni tâches",
    },
];
//# sourceMappingURL=collaboration-roles.js.map