export function projectCatalogFromRows(rows) {
    return rows.map(({ id, title, role }) => ({ id, title, role }));
}
export function roleForActiveProject(projectId, catalog, pendingOwnedProjectId) {
    if (projectId && projectId === pendingOwnedProjectId)
        return 'owner';
    return catalog.find(item => item.id === projectId)?.role ?? 'viewer';
}
export function shouldCreateProject(projectId, catalog, serverVersion) {
    return !serverVersion || !catalog.some(item => item.id === projectId);
}
//# sourceMappingURL=project-catalog.js.map