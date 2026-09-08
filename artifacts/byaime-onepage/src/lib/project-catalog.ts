export type ProjectCatalogItem = {
  id: string;
  title: string;
  role: string;
};

type ProjectRow = ProjectCatalogItem & {
  updatedAt?: string;
};

export function projectCatalogFromRows(rows: ProjectRow[]): ProjectCatalogItem[] {
  return rows.map(({ id, title, role }) => ({ id, title, role }));
}

export function roleForActiveProject(
  projectId: string | undefined,
  catalog: ProjectCatalogItem[],
  pendingOwnedProjectId?: string,
): string {
  if (projectId && projectId === pendingOwnedProjectId) return 'owner';
  return catalog.find(item => item.id === projectId)?.role ?? 'viewer';
}

export function shouldCreateProject(
  projectId: string,
  catalog: ProjectCatalogItem[],
  serverVersion: string | undefined,
): boolean {
  return !serverVersion || !catalog.some(item => item.id === projectId);
}