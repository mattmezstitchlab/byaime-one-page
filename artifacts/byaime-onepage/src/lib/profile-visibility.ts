import type { TimelineEvent } from "./types";

const financialKinds = new Set(["paiement", "facture", "devis"]);

export function canRoleSeeTimelineEvent(event: TimelineEvent, role: string): boolean {
  if (financialKinds.has(event.kind) && role !== "owner") return false;
  if (role === "owner") return true;
  if (role === "planner" || role === "family") return event.visibility !== "prive";
  return event.visibility === "audience";
}