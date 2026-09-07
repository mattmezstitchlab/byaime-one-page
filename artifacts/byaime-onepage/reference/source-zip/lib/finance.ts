/**
 * La finance est une couche de la ligne de temps, pas une base séparée.
 *
 * Un devis crée un engagement, un engagement crée un échéancier, une échéance
 * crée une action, une action crée un paiement, un paiement crée un événement,
 * et l'événement revient sur la ligne de temps.
 *
 * AIME prépare, l'utilisateur valide et autorise, un prestataire de paiement
 * exécuterait, la ligne de temps trace. Rien ici ne déplace d'argent.
 */
import { DAY, type Confidence, type WorldProject } from "./types";

/** Le chemin d'une obligation : détectée → proposée → vérifiée → validée → autorisée → programmée. */
export type CommitmentValidation =
  | "detecte"
  | "propose"
  | "verifie"
  | "valide"
  | "autorise"
  | "programme";

export const VALIDATION_LABEL: Record<CommitmentValidation, string> = {
  detecte: "Détecté",
  propose: "Proposé par AIME",
  verifie: "Vérifié",
  valide: "Validé par le couple",
  autorise: "Autorisé",
  programme: "Programmé",
};

const VALIDATION_RANK: Record<CommitmentValidation, number> = {
  detecte: 0,
  propose: 1,
  verifie: 2,
  valide: 3,
  autorise: 4,
  programme: 5,
};

/** État d'une échéance. Aucune n'est jamais supprimée : elle change d'état. */
export type InstallmentStatus =
  | "prevu"
  | "programme"
  | "paye"
  | "echoue"
  | "annule"
  | "suspendu"
  | "rembourse"
  | "litige";

export const INSTALLMENT_LABEL: Record<InstallmentStatus, string> = {
  prevu: "Prévu",
  programme: "Programmé",
  paye: "Payé",
  echoue: "Échec",
  annule: "Annulé",
  suspendu: "Suspendu",
  rembourse: "Remboursé",
  litige: "Litige",
};

export type BeneficiaryVerification = "inconnu" | "a_verifier" | "en_cours" | "verifie" | "echoue";

export const VERIFICATION_LABEL: Record<BeneficiaryVerification, string> = {
  inconnu: "Bénéficiaire inconnu",
  a_verifier: "Bénéficiaire à vérifier",
  en_cours: "Vérification en cours",
  verifie: "Bénéficiaire vérifié",
  echoue: "Vérification échouée",
};

/** Catégorie de l'engagement : une prestation, un emploi, un frais, une taxe. */
export type CommitmentCategory = "prestation" | "emploi" | "frais" | "cotisation" | "autre";

export type PaymentMethod =
  | "virement"
  | "prelevement"
  | "carte"
  | "especes"
  | "cheque"
  | "manuel"
  | "inconnu";

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  virement: "Virement",
  prelevement: "Prélèvement",
  carte: "Carte",
  especes: "Espèces",
  cheque: "Chèque",
  manuel: "Paiement manuel",
  inconnu: "Moyen de paiement à définir",
};

/** Une échéance : un montant, une date, un état, une autorisation. */
export type PaymentInstallment = {
  id: string;
  label: string;
  dueAt: number;
  amountCents: number;
  status: InstallmentStatus;
  validation: CommitmentValidation;
  /** L'autorisation de paiement donnée par le couple auprès du prestataire de paiement. */
  authorized?: boolean;
  paidAt?: number;
  method?: PaymentMethod;
  note?: string;
  confidence: Confidence;
};

/** L'engagement financier : la donnée source du montant. */
export type PaymentCommitment = {
  id: string;
  projectId: string;
  providerId?: string;
  /** Nom lisible du bénéficiaire, prestataire ou personne employée. */
  beneficiary: string;
  documentId?: string;
  employmentId?: string;
  category: CommitmentCategory;
  description: string;
  totalAmountCents: number;
  currency: string;
  /** Date de la prestation, qui n'est pas la date de paiement. */
  serviceDate?: number;
  paymentMethod: PaymentMethod;
  /** Prestataire de paiement pressenti : jamais imposé. */
  paymentProvider?: string;
  beneficiaryVerification: BeneficiaryVerification;
  validation: CommitmentValidation;
  schedule: PaymentInstallment[];
  source: string;
  notes?: string;
  confidence: Confidence;
  createdAt: number;
  updatedAt: number;
};

export type MoneyReady = "ready" | "action" | "blocked";

export const MONEY_READY_LABEL: Record<MoneyReady, string> = {
  ready: "Prêt",
  action: "Action requise",
  blocked: "Bloqué",
};

export const MONEY_READY_DOT: Record<MoneyReady, string> = {
  ready: "🟢",
  action: "🟠",
  blocked: "🔴",
};

export type Readiness = { state: MoneyReady; missing: string[] };

/**
 * MONEY READY : bénéficiaire identifié et vérifié, document présent,
 * montant confirmé, échéance confirmée, autorisation valide.
 */
export function readinessOf(c: PaymentCommitment, i: PaymentInstallment): Readiness {
  if (i.status === "paye" || i.status === "rembourse") return { state: "ready", missing: [] };

  const missing: string[] = [];
  let blocked = false;

  if (!c.beneficiary.trim()) {
    missing.push("Bénéficiaire non identifié");
    blocked = true;
  }
  if (c.beneficiaryVerification === "echoue") {
    missing.push("Vérification du bénéficiaire échouée");
    blocked = true;
  } else if (c.beneficiaryVerification !== "verifie") {
    missing.push(VERIFICATION_LABEL[c.beneficiaryVerification]);
  }
  if (!c.documentId) missing.push("Aucun document source rattaché");
  if (!i.amountCents) missing.push("Montant à confirmer");
  if (VALIDATION_RANK[i.validation] < VALIDATION_RANK["valide"]) {
    missing.push("Échéance à valider par le couple");
  }
  if (!i.authorized) missing.push("Autorisation de paiement à donner");
  if (c.paymentMethod === "inconnu") missing.push("Moyen de paiement à définir");

  if (i.status === "echoue" || i.status === "litige") {
    missing.unshift(INSTALLMENT_LABEL[i.status]);
    blocked = true;
  }
  if (i.status === "suspendu" || i.status === "annule") {
    missing.unshift(INSTALLMENT_LABEL[i.status]);
    blocked = true;
  }

  if (blocked) return { state: "blocked", missing };
  return missing.length ? { state: "action", missing } : { state: "ready", missing: [] };
}

/** L'état global d'un engagement : le plus contraignant de ses échéances à venir. */
export function commitmentReadiness(c: PaymentCommitment): Readiness {
  const open = c.schedule.filter((i) => i.status !== "paye" && i.status !== "rembourse");
  if (!open.length) return { state: "ready", missing: [] };
  const all = open.map((i) => readinessOf(c, i));
  const blocked = all.find((r) => r.state === "blocked");
  if (blocked) return blocked;
  const action = all.find((r) => r.state === "action");
  return action ?? { state: "ready", missing: [] };
}

/**
 * Un échéancier proposé à partir du total, de l'acompte et de la date de service.
 * Tout ce qui est calculé reste « proposé par AIME » jusqu'à validation.
 */
export function scheduleFrom(options: {
  id: string;
  totalCents: number;
  depositCents?: number;
  signedAt?: number;
  serviceDate: number;
  /** Nombre d'échéances intermédiaires entre l'acompte et le solde. */
  steps?: number;
  paidUntil?: number;
  role?: string;
}): PaymentInstallment[] {
  const { id, totalCents, serviceDate } = options;
  const deposit = options.depositCents ?? 0;
  const signed = options.signedAt ?? serviceDate - 300 * DAY;
  const steps = Math.max(0, options.steps ?? 0);
  const paidUntil = options.paidUntil ?? -Infinity;
  const out: PaymentInstallment[] = [];

  const mk = (
    suffix: string,
    label: string,
    dueAt: number,
    amountCents: number,
    confidence: Confidence,
  ): PaymentInstallment => {
    const paid = dueAt <= paidUntil;
    return {
      id: `${id}-${suffix}`,
      label,
      dueAt,
      amountCents,
      status: paid ? "paye" : "prevu",
      validation: paid ? "programme" : confidence === "confirme" ? "valide" : "propose",
      authorized: paid ? true : confidence === "confirme",
      ...(paid ? { paidAt: dueAt } : {}),
      method: "virement" as PaymentMethod,
      confidence,
    };
  };

  if (deposit > 0) {
    out.push(mk("acompte", "Acompte à la signature", signed + 2 * DAY, deposit, "confirme"));
  }

  const rest = Math.max(0, totalCents - deposit);
  if (steps > 0 && rest > 0) {
    const span = serviceDate - 15 * DAY - (signed + 30 * DAY);
    const slice = Math.round(rest / (steps + 1) / 100) * 100;
    for (let k = 0; k < steps; k += 1) {
      const dueAt = signed + 30 * DAY + Math.round((span * (k + 1)) / (steps + 1));
      out.push(mk(`etape-${k + 1}`, `Échéance ${k + 1}`, dueAt, slice, "deduit"));
    }
  }

  const already = out.reduce((s, i) => s + i.amountCents, 0);
  const balance = totalCents - already;
  if (balance > 0) {
    out.push(mk("solde", "Solde", serviceDate - 15 * DAY, balance, "confirme"));
  }

  return out.sort((a, b) => a.dueAt - b.dueAt);
}

/** Les jalons de préparation d'un paiement : J-30, J-15, J-7, J-2. */
export const PREP_STEPS: { days: number; label: string; detail: string }[] = [
  { days: 30, label: "Préparation du paiement", detail: "Vérifier le montant et le document source." },
  { days: 15, label: "Vérification", detail: "Bénéficiaire, coordonnées et autorisation." },
  { days: 7, label: "Rappel", detail: "Le paiement approche." },
  { days: 2, label: "Dernière vérification", detail: "Conditions réunies avant exécution." },
];

/** Un événement du journal financier. Rien n'est supprimé, on ajoute. */
export type PaymentEventType =
  | "PaymentCreated"
  | "PaymentValidated"
  | "PaymentAuthorized"
  | "PaymentScheduled"
  | "PaymentExecuted"
  | "PaymentConfirmed"
  | "PaymentFailed"
  | "PaymentCancelled"
  | "PaymentRefunded"
  | "BeneficiaryVerified"
  | "BeneficiaryVerificationFailed";

export const EVENT_LABEL: Record<PaymentEventType, string> = {
  PaymentCreated: "Engagement créé",
  PaymentValidated: "Échéance validée",
  PaymentAuthorized: "Paiement autorisé",
  PaymentScheduled: "Paiement programmé",
  PaymentExecuted: "Paiement exécuté",
  PaymentConfirmed: "Paiement confirmé",
  PaymentFailed: "Paiement échoué",
  PaymentCancelled: "Paiement annulé",
  PaymentRefunded: "Paiement remboursé",
  BeneficiaryVerified: "Bénéficiaire vérifié",
  BeneficiaryVerificationFailed: "Vérification échouée",
};

export type PaymentEvent = {
  id: string;
  at: number;
  type: PaymentEventType;
  commitmentId: string;
  installmentId?: string;
  amountCents?: number;
  beneficiary: string;
  actor: "AIME" | "Utilisateur" | "Prestataire de paiement";
  detail?: string;
};

/** Le journal financier : la trace immuable de ce qui s'est passé. */
export function ledgerOf(project: WorldProject): PaymentEvent[] {
  const out: PaymentEvent[] = [];
  for (const c of project.commitments ?? []) {
    out.push({
      id: `${c.id}-created`,
      at: c.createdAt,
      type: "PaymentCreated",
      commitmentId: c.id,
      amountCents: c.totalAmountCents,
      beneficiary: c.beneficiary,
      actor: c.source === "document" ? "AIME" : "Utilisateur",
      detail: c.description,
    });
    if (c.beneficiaryVerification === "verifie") {
      out.push({
        id: `${c.id}-kyc`,
        at: c.createdAt + DAY,
        type: "BeneficiaryVerified",
        commitmentId: c.id,
        beneficiary: c.beneficiary,
        actor: "Prestataire de paiement",
      });
    }
    if (c.beneficiaryVerification === "echoue") {
      out.push({
        id: `${c.id}-kyc-ko`,
        at: c.createdAt + DAY,
        type: "BeneficiaryVerificationFailed",
        commitmentId: c.id,
        beneficiary: c.beneficiary,
        actor: "Prestataire de paiement",
      });
    }
    for (const i of c.schedule) {
      if (VALIDATION_RANK[i.validation] >= VALIDATION_RANK["valide"]) {
        out.push({
          id: `${i.id}-validated`,
          at: Math.min(i.dueAt - 20 * DAY, c.createdAt + 2 * DAY),
          type: "PaymentValidated",
          commitmentId: c.id,
          installmentId: i.id,
          amountCents: i.amountCents,
          beneficiary: c.beneficiary,
          actor: "Utilisateur",
          detail: i.label,
        });
      }
      if (i.authorized) {
        out.push({
          id: `${i.id}-authorized`,
          at: i.dueAt - 10 * DAY,
          type: "PaymentAuthorized",
          commitmentId: c.id,
          installmentId: i.id,
          amountCents: i.amountCents,
          beneficiary: c.beneficiary,
          actor: "Utilisateur",
          detail: METHOD_LABEL[i.method ?? "inconnu"],
        });
      }
      if (i.status === "programme") {
        out.push({
          id: `${i.id}-scheduled`,
          at: i.dueAt - 5 * DAY,
          type: "PaymentScheduled",
          commitmentId: c.id,
          installmentId: i.id,
          amountCents: i.amountCents,
          beneficiary: c.beneficiary,
          actor: "AIME",
          detail: i.label,
        });
      }
      if (i.status === "paye") {
        out.push({
          id: `${i.id}-executed`,
          at: i.paidAt ?? i.dueAt,
          type: "PaymentExecuted",
          commitmentId: c.id,
          installmentId: i.id,
          amountCents: i.amountCents,
          beneficiary: c.beneficiary,
          actor: "Prestataire de paiement",
          detail: i.label,
        });
      }
      if (i.status === "echoue") {
        out.push({
          id: `${i.id}-failed`,
          at: i.dueAt,
          type: "PaymentFailed",
          commitmentId: c.id,
          installmentId: i.id,
          amountCents: i.amountCents,
          beneficiary: c.beneficiary,
          actor: "Prestataire de paiement",
          detail: i.note ?? "À réessayer.",
        });
      }
      if (i.status === "annule") {
        out.push({
          id: `${i.id}-cancelled`,
          at: i.dueAt,
          type: "PaymentCancelled",
          commitmentId: c.id,
          installmentId: i.id,
          amountCents: i.amountCents,
          beneficiary: c.beneficiary,
          actor: "Utilisateur",
        });
      }
      if (i.status === "rembourse") {
        out.push({
          id: `${i.id}-refunded`,
          at: i.paidAt ?? i.dueAt,
          type: "PaymentRefunded",
          commitmentId: c.id,
          installmentId: i.id,
          amountCents: i.amountCents,
          beneficiary: c.beneficiary,
          actor: "Prestataire de paiement",
        });
      }
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

export type FinanceSummary = {
  total: number;
  paid: number;
  scheduled: number;
  pending: number;
  blocked: number;
  toPlan: number;
  after: number;
};

/** Le tableau de bord : une lecture des engagements, jamais une saisie parallèle. */
export function financeSummary(project: WorldProject, now = Date.now()): FinanceSummary {
  const pivot = project.pivot.value;
  const s: FinanceSummary = {
    total: 0,
    paid: 0,
    scheduled: 0,
    pending: 0,
    blocked: 0,
    toPlan: 0,
    after: 0,
  };
  for (const c of project.commitments ?? []) {
    s.total += c.totalAmountCents;
    for (const i of c.schedule) {
      if (i.status === "paye") {
        s.paid += i.amountCents;
        continue;
      }
      if (i.status === "annule" || i.status === "rembourse") continue;
      const r = readinessOf(c, i);
      if (r.state === "blocked") s.blocked += i.amountCents;
      else if (r.state === "ready") s.scheduled += i.amountCents;
      else s.pending += i.amountCents;
      if (i.dueAt > pivot) s.after += i.amountCents;
    }
  }
  const covered = (project.commitments ?? []).reduce(
    (sum, c) => sum + c.schedule.reduce((k, i) => k + (i.status === "annule" ? 0 : i.amountCents), 0),
    0,
  );
  s.toPlan = Math.max(0, s.total - covered);
  void now;
  return s;
}

export type FinanceAlert = {
  id: string;
  level: "info" | "attention" | "bloquant";
  title: string;
  detail: string;
  at: number;
  commitmentId?: string;
};

/** Ce qu'AIME remarque. Jamais une décision : une alerte. */
export function financeAlerts(project: WorldProject, now = Date.now()): FinanceAlert[] {
  const out: FinanceAlert[] = [];
  const commitments = project.commitments ?? [];

  for (const c of commitments) {
    if (c.beneficiaryVerification !== "verifie" && c.schedule.some((i) => i.status !== "paye")) {
      out.push({
        id: `${c.id}-kyc`,
        level: "attention",
        title: `${c.beneficiary} — bénéficiaire non vérifié`,
        detail: "Aucun paiement ne peut être exécuté tant que le bénéficiaire n'est pas vérifié.",
        at: now,
        commitmentId: c.id,
      });
    }
    if (c.paymentMethod === "inconnu") {
      out.push({
        id: `${c.id}-method`,
        level: "attention",
        title: `${c.beneficiary} — aucun moyen de paiement validé`,
        detail: "Le contrat ne porte pas encore de moyen de paiement autorisé.",
        at: now,
        commitmentId: c.id,
      });
    }
    for (const i of c.schedule) {
      if (i.status === "paye" || i.status === "annule") continue;
      const days = Math.round((i.dueAt - now) / DAY);
      if (days >= 0 && days <= 21) {
        out.push({
          id: `${i.id}-soon`,
          level: days <= 7 ? "attention" : "info",
          title: `${i.label} — ${c.beneficiary} dans ${days} jour${days > 1 ? "s" : ""}`,
          detail: readinessOf(c, i).missing.join(" · ") || "Toutes les conditions sont réunies.",
          at: i.dueAt,
          commitmentId: c.id,
        });
      }
      if (days < 0 && i.status !== "programme") {
        out.push({
          id: `${i.id}-late`,
          level: "bloquant",
          title: `${i.label} — ${c.beneficiary} en retard`,
          detail: "L'échéance est passée sans exécution enregistrée.",
          at: i.dueAt,
          commitmentId: c.id,
        });
      }
      if (c.serviceDate && i.dueAt < c.serviceDate - 400 * DAY) {
        out.push({
          id: `${i.id}-early`,
          level: "attention",
          title: `${i.label} — paiement très en avance`,
          detail: "Le paiement est prévu bien avant la date contractuelle de la prestation.",
          at: i.dueAt,
          commitmentId: c.id,
        });
      }
    }
  }

  for (const p of project.providers) {
    if (!p.amountCents) continue;
    const linked = commitments.find((c) => c.providerId === p.id);
    if (!linked) {
      out.push({
        id: `${p.id}-orphelin`,
        level: "attention",
        title: `${p.name ?? p.role} — prestation sans engagement financier`,
        detail: "Une prestation est prévue mais aucun engagement ne lui est rattaché.",
        at: now,
      });
      continue;
    }
    if (linked.totalAmountCents > p.amountCents) {
      out.push({
        id: `${p.id}-depassement`,
        level: "attention",
        title: `${p.name ?? p.role} — au-dessus du budget prévu`,
        detail: "Le montant engagé dépasse le devis initial.",
        at: now,
        commitmentId: linked.id,
      });
    }
  }

  return out.sort((a, b) => a.at - b.at);
}

export function commitmentById(project: WorldProject, id?: string) {
  return id ? (project.commitments ?? []).find((c) => c.id === id) : undefined;
}

/** La prochaine échéance non payée : celle dont PLAY parle. */
export function nextInstallment(project: WorldProject, now = Date.now()) {
  let best: { commitment: PaymentCommitment; installment: PaymentInstallment } | null = null;
  for (const c of project.commitments ?? []) {
    for (const i of c.schedule) {
      if (i.status === "paye" || i.status === "annule" || i.status === "rembourse") continue;
      if (i.dueAt < now) continue;
      if (!best || i.dueAt < best.installment.dueAt) best = { commitment: c, installment: i };
    }
  }
  return best;
}
