export type ProjectCatalogItem = {
  id: string;
  title: string;
  role: string;
  /** Transient label derived from the authorized project response, never persisted. */
  displayLabel?: string;
};

type ProjectRow = ProjectCatalogItem & {
  updatedAt?: string;
  data?: unknown;
};

export function projectCatalogFromRows(
  rows: ProjectRow[],
): ProjectCatalogItem[] {
  return rows.map(({ id, title, role, data }) => ({
    id,
    title,
    role,
    displayLabel: weddingDisplayLabel(title, data),
  }));
}

export function roleForActiveProject(
  projectId: string | undefined,
  catalog: ProjectCatalogItem[],
  pendingOwnedProjectId?: string,
): string {
  if (projectId && projectId === pendingOwnedProjectId) return "owner";
  return catalog.find((item) => item.id === projectId)?.role ?? "viewer";
}

export function shouldCreateProject(
  projectId: string,
  catalog: ProjectCatalogItem[],
  serverVersion: string | undefined,
): boolean {
  return !serverVersion || !catalog.some((item) => item.id === projectId);
}
/** Use existing title (including couple names when supplied), date and location only. */
export function weddingDisplayLabel(title: string, value: unknown): string {
  const data =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const fact = (key: string) => {
    const f = data[key];
    return f &&
      typeof f === "object" &&
      "value" in f &&
      !("confidence" in f && f.confidence === "manquant")
      ? f.value
      : undefined;
  };
  const pivot = fact("pivot");
  const date =
    typeof pivot === "number" &&
    Number.isFinite(pivot) &&
    Number.isFinite(new Date(pivot).getTime())
      ? new Intl.DateTimeFormat("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Europe/Paris",
        }).format(pivot)
      : "";
  const places = [fact("venue"), fact("city")]
    .filter((v): v is string => typeof v === "string" && Boolean(v.trim()))
    .map((v) => v.trim());
  const people = Array.isArray(data.cardParticipants)
    ? data.cardParticipants
    : [];
  const coupleNames = people.flatMap((person) => {
    if (!person || typeof person !== "object") return [];
    const roles = person.participation?.roles;
    if (
      !Array.isArray(roles) ||
      !roles.some((r: unknown) => r === "Marié" || r === "Mariée")
    )
      return [];
    const name = [person.card?.firstName, person.card?.lastName]
      .filter((v): v is string => typeof v === "string" && Boolean(v.trim()))
      .map((v) => v.trim())
      .join(" ");
    return name ? [name] : [];
  });
  const names = coupleNames.join(" et ");
  const heading =
    names && /^(notre mariage|mon mariage|mariage)$/i.test(title.trim())
      ? `Mariage de ${names}`
      : [title.trim(), names].filter(Boolean).join(" — ");
  return [
    heading,
    date,
    ...places.filter(
      (p, i) =>
        places.findIndex(
          (v) => v.toLocaleLowerCase() === p.toLocaleLowerCase(),
        ) === i,
    ),
  ]
    .filter(Boolean)
    .join(" · ");
}
