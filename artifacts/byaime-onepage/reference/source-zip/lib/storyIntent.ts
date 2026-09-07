/**
 * AIME INTENT — lecture dynamique du récit (Vague 3, étape 6).
 *
 * Ce module est PUR (aucune dépendance serveur) : il produit le contexte de
 * lecture par type de projet — prompt, schéma de sortie, rôles autorisés,
 * clés de faits extensibles — et normalise les `details` retournés par le
 * modèle. `storyRead.functions.ts` n'assemble que l'appel.
 *
 * Règles :
 * - un type choisi (« univers/domaine ») donne une lecture spécialisée :
 *   libellé du Domaine dans le prompt, enum des rôles = rôles du blueprint
 *   employé, clés `details` = clés du registre (budget + futurs packs) ;
 * - sans type, le comportement historique est conservé tel quel (fantôme
 *   mariage, prompt et rôles verbatim) — filet de sécurité ;
 * - jamais d'invention : les details ne peuvent viser que les clés
 *   autorisées et des valeurs primitives, et ne sont jamais transformées.
 */
import { WEDDING_ROLES } from "./wedding";
import { blueprintFor, projectTypeById } from "./blueprints";
import { questionsFor } from "./questions";
import type { DetailValue } from "./parseStory";

export type IntentContext = {
  /** Libellé du Domaine (« Concert ») — null : filet historique. */
  typeLabel: string | null;
  /** Rôles pour lesquels « déjà réservé / trouvé » a du sens pour ce projet. */
  roles: readonly string[];
  /** Clés de faits extensibles que la lecture est autorisée à remplir. */
  detailKeys: readonly string[];
};

/** Le contexte de lecture pour un type choisi (ou le filet historique). */
export function intentContextFor(typeId?: string | null): IntentContext {
  const type = projectTypeById(typeId ?? null);
  if (!type) return { typeLabel: null, roles: WEDDING_ROLES, detailKeys: ["budget"] };
  const detailKeys = new Set<string>(["budget"]);
  for (const q of questionsFor(type.id)) {
    if (q.mapsTo.startsWith("detail:")) detailKeys.add(q.mapsTo.slice("detail:".length));
  }
  return {
    typeLabel: type.label,
    roles: blueprintFor(type.id).roles,
    detailKeys: [...detailKeys],
  };
}

/** Prompt historique, conservé verbatim pour le filet sans type. */
const LEGACY_SYSTEM = `Tu es AIME. Tu lis le récit d'un mariage écrit en langage libre et tu en extrais uniquement ce qui y est dit.
N'invente rien : si une information n'est pas dans le récit, réponds null (ou une liste vide).
"date" : la date du jour J au format AAAA-MM-JJ. Si seul un mois ou une saison est donné, choisis une date plausible dans cette période à venir. Si rien n'est dit, null.
"heure" : heure de cérémonie en nombre décimal (15.5 = 15 h 30), null si absente.
"prestatairesTrouves" : uniquement les métiers déjà réservés, choisis, signés ou trouvés d'après le récit.
"resume" : une phrase en français qui redit le projet tel que compris.`;

/** Le prompt de lecture, spécialisé par le Domaine quand il est connu. */
export function intentSystem(ctx: IntentContext): string {
  if (!ctx.typeLabel) return LEGACY_SYSTEM;
  return `Tu es AIME. Tu lis le récit d'un projet de type « ${ctx.typeLabel} » écrit en langage libre et tu en extrais uniquement ce qui y est dit.
N'invente rien : si une information n'est pas dans le récit, réponds null (ou une liste vide).
"date" : la date du jour pivot du projet au format AAAA-MM-JJ. Si seul un mois ou une saison est donné, choisis une date plausible dans cette période à venir. Si rien n'est dit, null.
"ville" et "lieu" : là où le projet se situe, si c'est dit.
"invites" : le nombre de personnes attendues ou concernées, null si absent.
"heure" : l'heure du moment principal en nombre décimal (15.5 = 15 h 30), null si absente.
"couple" : uniquement si le récit porte explicitement sur un duo nommé, sinon null.
"prestatairesTrouves" : uniquement les rôles déjà réservés, choisis, signés ou trouvés d'après le récit, parmi les rôles autorisés.
"details" : uniquement des faits explicitement présents dans le récit et relevant des clés autorisées ; les montants en nombre.
"resume" : une phrase en français qui redit le projet tel que compris.`;
}

/** Schéma de sortie structurée, borné par le contexte (rôles et clés details). */
export function intentSchema(ctx: IntentContext) {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "couple",
      "date",
      "ville",
      "lieu",
      "invites",
      "heure",
      "prestatairesTrouves",
      "details",
      "resume",
    ],
    properties: {
      couple: { type: ["string", "null"] },
      date: { type: ["string", "null"] },
      ville: { type: ["string", "null"] },
      lieu: { type: ["string", "null"] },
      invites: { type: ["number", "null"] },
      heure: { type: ["number", "null"] },
      prestatairesTrouves: { type: "array", items: { type: "string", enum: [...ctx.roles] } },
      details: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["key", "value"],
          properties: {
            key: { type: "string", enum: [...ctx.detailKeys] },
            value: { type: ["string", "number", "boolean"] },
          },
        },
      },
      resume: { type: "string" },
    },
  } as const;
}

/**
 * Les `details` retournés par le modèle, normalisés : seules les clés
 * autorisées et des valeurs primitives passent, verbatim ; la première
 * occurrence d'une clé fait foi ; au plus 12 faits.
 */
export function aiDetailsToRecord(
  items: unknown,
  ctx: IntentContext,
): Record<string, DetailValue> | undefined {
  if (!Array.isArray(items)) return undefined;
  const allowed = new Set(ctx.detailKeys);
  const out: Record<string, DetailValue> = {};
  for (const item of items.slice(0, 24)) {
    const key = (item as { key?: unknown })?.key;
    const value = (item as { value?: unknown })?.value;
    if (typeof key !== "string" || !allowed.has(key)) continue;
    if (!(typeof value === "string" || typeof value === "number" || typeof value === "boolean"))
      continue;
    if (!(key in out)) out[key] = value;
    if (Object.keys(out).length >= 12) break;
  }
  return Object.keys(out).length ? out : undefined;
}
