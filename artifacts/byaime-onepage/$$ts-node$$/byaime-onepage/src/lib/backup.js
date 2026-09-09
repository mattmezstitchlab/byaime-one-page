export function backupProject(project) {
    return JSON.stringify({ format: "aime-backup", version: 1, project: { data: project } });
}
export function restoreProject(serialized) {
    const parsed = JSON.parse(serialized);
    const value = parsed?.format === "aime-backup" ? parsed.project?.data : parsed;
    if (!value || typeof value !== "object" || typeof value.id !== "string" || typeof value.title !== "string") {
        throw new Error("Sauvegarde AIME invalide");
    }
    return value;
}
//# sourceMappingURL=backup.js.map