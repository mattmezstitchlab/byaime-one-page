export type ProjectRole = "owner" | "planner" | "family" | "viewer";
export type ProjectAction = "read" | "edit" | "manage" | "delete";

export function can(role: ProjectRole | undefined, action: ProjectAction): boolean {
  if (!role) return false;
  if (action === "read") return true;
  if (action === "edit") return role !== "viewer";
  if (action === "manage") return role === "owner" || role === "planner";
  return role === "owner";
}

export function authenticatedUserId(auth: { userId?: string | null; sessionClaims?: unknown }): string | undefined {
  const claims = auth.sessionClaims as { userId?: unknown } | undefined;
  return typeof claims?.userId === "string" ? claims.userId : auth.userId ?? undefined;
}