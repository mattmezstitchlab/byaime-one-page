import type { TimelineAlert, TimelineMarker } from "@/components/aime/HeroTimeline";

/**
 * Ce qui se passe sur un repère : une seule lecture des alertes,
 * partagée par toutes les lignes de temps (personne, monde, démo).
 */
export function markerAlerts(m: TimelineMarker): TimelineAlert[] {
  const out: TimelineAlert[] = [];
  if (m.status === "bloque" || m.status === "echoue")
    out.push({ id: `${m.id}-bloc`, title: "Ce point est bloqué.", severity: "critique" });
  if (m.status === "a_valider")
    out.push({ id: `${m.id}-val`, title: "En attente de votre validation.", severity: "attention" });
  if (m.pending)
    out.push({ id: `${m.id}-prop`, title: "Proposition d'AIME, à confirmer.", severity: "info" });
  if (
    (m.kind === "devis" || m.kind === "facture" || m.kind === "paiement") &&
    typeof m.amountCents !== "number"
  )
    out.push({ id: `${m.id}-eur`, title: "Le montant manque.", severity: "attention" });
  return out;
}
