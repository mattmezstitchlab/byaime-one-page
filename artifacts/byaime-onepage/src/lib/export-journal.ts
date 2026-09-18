import { exportableDocuments, paymentsForDocument } from "./document-tense";
import type { Document, ExportEntry, Payment, WorldProject } from "./types";

/*
 * LE PASSÉ EST LA SEULE CHOSE QUI SORT — ET IL NE SORT QU'UNE FOIS PAR ÉTAT.
 *
 * Pennylane, un export CSV, un dossier de preuves d'emploi : autant de
 * DESTINATIONS. Aucune n'est la source de vérité. Le Monde garde la sienne
 * et tient un journal de ce qu'il a laissé sortir :
 *
 *  - append-only : une entrée ne se modifie ni ne s'efface. Si le fait change
 *    (montant corrigé, paiement re-rapproché), son empreinte change et une
 *    NOUVELLE entrée est écrite ; l'ancienne reste, datée ;
 *  - idempotent : même fait, même empreinte, même destination → rien à
 *    ajouter. On peut relancer un export sans polluer le journal ;
 *  - seul un FAIT (facture rapprochée d'un paiement réglé) est journalisable.
 *    `exportableDocuments` reste l'unique porte : ce module ne la contourne pas.
 *
 * Aucune horloge implicite : `now` est toujours un paramètre. Aucun appel
 * réseau : un connecteur réel viendra APRÈS ce journal, jamais à sa place
 * (mémoire « connector-http-responses » : vérifier la réponse HTTP avant
 * d'écrire une entrée de succès).
 */

export const EXPORT_DESTINATIONS = ["pennylane", "csv", "preuve"] as const satisfies ReadonlyArray<ExportEntry["destination"]>;
export type ExportDestination = ExportEntry["destination"];
export type { ExportEntry };

/**
 * Empreinte FNV-1a 32 bits, en hexadécimal. Synchrone et déterministe : ce
 * n'est pas une signature cryptographique, c'est un témoin d'état — assez
 * pour dire « ce fait a-t-il changé depuis le dernier export ? ».
 */
export function fingerprint(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** Les paiements réglés qui rapprochent ce document, triés par date puis id. */
export function settledPaymentsFor(document: Document, payments: ReadonlyArray<Payment>): Payment[] {
  return paymentsForDocument(document, payments)
    .filter(payment => payment.state === "paye")
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}

/** Le montant d'un fait : la somme des paiements réglés qui le couvrent. */
export function factAmountCents(document: Document, payments: ReadonlyArray<Payment>): number {
  return settledPaymentsFor(document, payments).reduce((sum, payment) => sum + payment.amountCents, 0);
}

/**
 * L'empreinte d'un fait : ce qui, s'il change, justifie une nouvelle entrée.
 * Le titre, la date, le prestataire, et chaque paiement réglé (id, date,
 * montant). L'URL du fichier n'en fait pas partie : un ré-import du même PDF
 * n'est pas un nouveau fait.
 */
export function factFingerprint(document: Document, payments: ReadonlyArray<Payment>): string {
  const settled = settledPaymentsFor(document, payments)
    .map(payment => `${payment.id}:${payment.at}:${payment.amountCents}`)
    .join("|");
  return fingerprint([document.id, document.kind, document.title, document.at, document.providerId ?? "", settled].join("\u001f"));
}

/** Les entrées d'un document pour une destination, de la plus ancienne à la plus récente. */
export function exportHistoryFor(
  documentId: string,
  log: ReadonlyArray<ExportEntry>,
  destination?: ExportDestination,
): ExportEntry[] {
  return log
    .filter(entry => entry.documentId === documentId && (!destination || entry.destination === destination))
    .sort((a, b) => a.exportedAt - b.exportedAt);
}

/** La dernière entrée d'un document pour une destination, s'il en existe une. */
export function lastExportFor(
  documentId: string,
  log: ReadonlyArray<ExportEntry>,
  destination: ExportDestination,
): ExportEntry | undefined {
  const history = exportHistoryFor(documentId, log, destination);
  return history[history.length - 1];
}

export type ExportProject = Pick<WorldProject, "documents" | "payments" | "exportLog">;

/**
 * Les faits qu'il reste à exporter vers une destination : exportables, et
 * dont l'empreinte actuelle diffère de la dernière entrée journalisée.
 */
export function pendingExports(project: ExportProject, destination: ExportDestination): Document[] {
  const log = project.exportLog ?? [];
  return exportableDocuments(project).filter(document => {
    const last = lastExportFor(document.id, log, destination);
    return !last || last.hash !== factFingerprint(document, project.payments);
  });
}

/**
 * Journalise un export. Ne touche jamais aux entrées existantes ; n'écrit que
 * pour les documents encore en attente (idempotent). Retourne les entrées
 * ajoutées et le journal complet — c'est à l'appelant de persister.
 */
export function appendExport(
  project: ExportProject,
  destination: ExportDestination,
  now: number,
  options: { documentIds?: ReadonlyArray<string>; makeId?: () => string } = {},
): { added: ExportEntry[]; exportLog: ExportEntry[] } {
  const log = project.exportLog ?? [];
  const wanted = options.documentIds ? new Set(options.documentIds) : null;
  const makeId = options.makeId ?? (() => `export-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const added = pendingExports(project, destination)
    .filter(document => !wanted || wanted.has(document.id))
    .map<ExportEntry>(document => ({
      id: makeId(),
      documentId: document.id,
      destination,
      exportedAt: now,
      hash: factFingerprint(document, project.payments),
      amountCents: factAmountCents(document, project.payments),
      providerId: document.providerId,
      paymentIds: settledPaymentsFor(document, project.payments).map(payment => payment.id),
    }));
  return { added, exportLog: [...log, ...added] };
}

/**
 * Le journal n'est pas modifiable : on ne peut que le prolonger. Toute
 * tentative de réécrire ou de supprimer une entrée existante est rejetée —
 * c'est la garde que le serveur et le magasin local appliquent avant
 * d'accepter un nouveau journal.
 */
export function isAppendOnly(previous: ReadonlyArray<ExportEntry>, next: ReadonlyArray<ExportEntry>): boolean {
  if (next.length < previous.length) return false;
  return previous.every((entry, index) => JSON.stringify(next[index]) === JSON.stringify(entry));
}

const csvCell = (value: string | number): string => {
  const text = String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
};

const isoDay = (time: number): string => new Date(time).toISOString().slice(0, 10);

/**
 * Le CSV d'un lot d'entrées : une ligne par fait, séparateur « ; », montants
 * en euros à deux décimales — le format que Pennylane et la plupart des
 * imports comptables lisent tels quels. Pas de connecteur ici : un fichier
 * que l'on tient en main est déjà une destination.
 */
export function buildExportCsv(
  entries: ReadonlyArray<ExportEntry>,
  project: Pick<WorldProject, "documents" | "providers" | "payments">,
): string {
  const header = ["date", "libelle", "montant", "tiers", "reference", "paiements", "empreinte"];
  const rows = entries.map(entry => {
    const document = project.documents.find(item => item.id === entry.documentId);
    const provider = project.providers.find(item => item.id === entry.providerId);
    const settled = project.payments.filter(payment => entry.paymentIds.includes(payment.id));
    const date = settled.length > 0 ? Math.max(...settled.map(payment => payment.at)) : document?.at ?? entry.exportedAt;
    return [
      isoDay(date),
      document?.title ?? entry.documentId,
      (entry.amountCents / 100).toFixed(2),
      provider ? (provider.name || provider.role) : "",
      entry.documentId,
      settled.map(payment => `${isoDay(payment.at)} ${payment.label}`).join(" + "),
      entry.hash,
    ].map(csvCell).join(";");
  });
  return [header.join(";"), ...rows].join("\n");
}
