import type { ProjectRole } from "./permissions";

type Row = Record<string, unknown>;
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object") : [];
const financialKinds = new Set(["paiement", "facture", "devis"]);

function canSeeEvent(event: Row, role: ProjectRole): boolean {
  if (financialKinds.has(String(event.kind ?? "")) && role !== "owner") return false;
  if (role === "owner") return true;
  if (role === "planner" || role === "family") return event.visibility !== "prive";
  return event.visibility === "audience";
}

export function projectDataForRole(value: unknown, role: ProjectRole): Row {
  const data = value && typeof value === "object" ? value as Row : {};
  if (role === "owner") return data;
  const providers = role === "viewer" ? [] : rows(data.providers).map(({ amountCents: _amount, depositCents: _deposit, paidCents: _paid, ...provider }) => provider);
  return {
    ...data,
    budget: { value: null, confidence: "manquant" },
    payments: [],
    documents: [],
    exportLog: [],
    providers,
    tasks: role === "viewer" ? [] : data.tasks,
    timeline: rows(data.timeline).filter(event => canSeeEvent(event, role)),
  };
}

/**
 * Le journal des exports ne se prolonge que par la fin : si le journal soumis
 * ne commence pas par l'exact journal connu, il est refusé et l'ancien reste.
 * Même le propriétaire ne peut pas réécrire ce qui est déjà sorti du Monde.
 */
export function appendOnlyExportLog(currentValue: unknown, submittedValue: unknown): Row[] {
  const current = rows(currentValue);
  const submitted = rows(submittedValue);
  if (submitted.length < current.length) return current;
  const preserved = current.every((entry, index) => JSON.stringify(submitted[index]) === JSON.stringify(entry));
  return preserved ? submitted : current;
}

export function mergeProtectedProjectData(currentValue: unknown, submittedValue: unknown, role: ProjectRole): Row {
  const current = currentValue && typeof currentValue === "object" ? currentValue as Row : {};
  const submitted = submittedValue && typeof submittedValue === "object" ? submittedValue as Row : {};
  /* Les attestations sont les écritures de la contrepartie : personne dans le
     Monde ne peut les écrire, les modifier ni les effacer par la sauvegarde.
     Elles n'entrent que par la réponse à un lien de claim (route dédiée). */
  if (role === "owner") return { ...submitted, exportLog: appendOnlyExportLog(current.exportLog, submitted.exportLog), attestations: rows(current.attestations) };

  const currentEvents = rows(current.timeline);
  const submittedVisibleEvents = rows(submitted.timeline).filter(event => canSeeEvent(event, role));
  const hiddenEvents = currentEvents.filter(event => !canSeeEvent(event, role));
  const currentProviders = new Map(rows(current.providers).map(provider => [String(provider.id ?? ""), provider]));
  const providers = rows(submitted.providers).map(({ amountCents: _amount, depositCents: _deposit, paidCents: _paid, ...provider }) => {
    const protectedProvider = currentProviders.get(String(provider.id ?? ""));
    return {
      ...provider,
      ...(protectedProvider?.amountCents === undefined ? {} : { amountCents: protectedProvider.amountCents }),
      ...(protectedProvider?.depositCents === undefined ? {} : { depositCents: protectedProvider.depositCents }),
      ...(protectedProvider?.paidCents === undefined ? {} : { paidCents: protectedProvider.paidCents }),
    };
  });

  return {
    ...submitted,
    budget: current.budget,
    payments: current.payments,
    documents: current.documents,
    exportLog: current.exportLog,
    attestations: rows(current.attestations),
    publicProfile: current.publicProfile,
    providers,
    timeline: [...submittedVisibleEvents, ...hiddenEvents],
  };
}